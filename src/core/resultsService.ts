/**
 * Results service: the domain core's entry point for the UI.
 *
 * - `loadCompetition` fetches one Competition's Results for a Window. Each
 *   Competition loads independently, so the UI can render them as they arrive
 *   and retry one without touching the others.
 *
 * The outside world (fetch, clock, timezone, storage) is injected.
 */
import { loadWithPastDayCache } from './cache';
import { fetchResults as fetchEspnResults } from './espn/adapter';
import type { Competition, LocalDate, Result, WindowDays } from './types';
import { resolveWindow } from './window';
import { createWorldRugbyFetcher } from './worldRugby/adapter';

export type CompetitionOutcome =
  | { status: 'results'; results: Result[] }
  | { status: 'empty' }
  | { status: 'error'; message: string };

export interface ResultsServiceDeps {
  fetch: typeof fetch;
  now: () => Date;
  timeZone: string;
  storage?: Storage;
}

export interface ResultsService {
  /** Load (or, for Retry, reload) one Competition. Never rejects. */
  loadCompetition(competition: Competition, days: WindowDays): Promise<CompetitionOutcome>;
}

export function createResultsService(deps: ResultsServiceDeps): ResultsService {
  const fetchWorldRugby = createWorldRugbyFetcher(deps.fetch);
  const fetchResults = (competition: Competition, dates: LocalDate[]) =>
    competition.source.kind === 'world-rugby'
      ? fetchWorldRugby(competition, dates, deps.timeZone)
      : fetchEspnResults(deps.fetch, competition, dates, deps.timeZone);
  return {
    async loadCompetition(competition, days) {
      const window = resolveWindow(days, deps.now(), deps.timeZone);
      const fetchDates = (dates: LocalDate[]) => fetchResults(competition, dates);
      try {
        const results = (
          await loadWithPastDayCache(window.dates, fetchDates, {
            storage: deps.storage,
            competitionId: competition.id,
            timeZone: deps.timeZone,
            today: window.end,
          })
        ).sort((a, b) => b.kickoff.localeCompare(a.kickoff));
        return results.length > 0 ? { status: 'results', results } : { status: 'empty' };
      } catch {
        return { status: 'error', message: `Couldn't load ${competition.name} results.` };
      }
    },
  };
}
