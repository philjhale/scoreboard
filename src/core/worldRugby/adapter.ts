/**
 * The World Rugby adapter: the only place that knows the Pulselive URLs and
 * JSON shapes (see `docs/research/world-rugby-pulselive-pwr-wxv.md`). It turns
 * schedule responses into Results, tolerantly: a malformed match is skipped,
 * never fatal. An unexpected body throws.
 *
 * Unlike ESPN there is no date-range query. A Competition's event (one
 * edition) has an id that changes every season, so it is resolved from the
 * event list by label, then its whole schedule is fetched and filtered to the
 * Window client-side.
 */
import type { Competition, LocalDate, Result, Team, Winner } from '../types';
import { addDays, localDateOf } from '../window';

const BASE = 'https://api.wr-rims-prod.pulselive.com/rugby/v3';

export type FetchWorldRugbyResults = (
  competition: Competition,
  dates: LocalDate[],
  timeZone: string,
) => Promise<Result[]>;

/** An event (one edition of a Competition) from the event list. */
interface EventInfo {
  id: string;
  label: string;
  /** First and last day, `YYYY-MM-DD`. */
  start: string;
  end: string;
}

/**
 * A fetcher that shares event-list requests between Competitions: the list is
 * requested once per date range, however many Competitions need it. A failed
 * request is forgotten so a retry asks again.
 */
export function createWorldRugbyFetcher(fetchFn: typeof fetch): FetchWorldRugbyResults {
  const lists = new Map<string, Promise<EventInfo[]>>();
  const eventList = (startDate: string, endDate: string) => {
    const key = `${startDate}/${endDate}`;
    let list = lists.get(key);
    if (!list) {
      list = fetchEvents(fetchFn, startDate, endDate);
      lists.set(key, list);
      list.catch(() => lists.delete(key));
    }
    return list;
  };

  return async (competition, dates, timeZone) => {
    const { source } = competition;
    if (source.kind !== 'world-rugby') {
      throw new Error(`${competition.id} is not a World Rugby Competition`);
    }
    const first = dates[0]!;
    const last = dates[dates.length - 1]!;
    // The list holds events by start date, and a season starts the year before
    // its label, so look back to the start of the previous year.
    const events = await eventList(`${Number(first.slice(0, 4)) - 1}-01-01`, `${last.slice(0, 4)}-12-31`);
    // Kick-off days can differ from event days by a timezone, so allow a day either side.
    const labelled = new RegExp(`^${escapeRegExp(source.eventName)} \\d{4}$`);
    const wanted = events.filter(
      (e) => labelled.test(e.label) && e.start <= addDays(last, 1) && e.end >= addDays(first, -1),
    );

    const requested = new Set(dates);
    const results = await Promise.all(
      wanted.map(async (event) =>
        parseSchedule(await getJson(fetchFn, scheduleUrl(event.id)), competition),
      ),
    );
    return results
      .flat()
      .filter((r) => requested.has(localDateOf(new Date(r.kickoff), timeZone)));
  };
}

async function getJson(fetchFn: typeof fetch, url: string): Promise<unknown> {
  const response = await fetchFn(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}

function scheduleUrl(eventId: string): string {
  return `${BASE}/event/${eventId}/schedule?language=en`;
}

/** Every page of the event list for a date range (events starting within it). */
async function fetchEvents(
  fetchFn: typeof fetch,
  startDate: string,
  endDate: string,
): Promise<EventInfo[]> {
  const page = (n: number) =>
    getJson(
      fetchFn,
      `${BASE}/event?${new URLSearchParams({ startDate, endDate, pageSize: '100', page: String(n) })}`,
    );
  const first = await page(0);
  const numPages = at(first, 'pageInfo', 'numPages');
  if (typeof numPages !== 'number') throw new Error('Unexpected World Rugby event list');
  const rest = await Promise.all(Array.from({ length: Math.max(0, numPages - 1) }, (_, i) => page(i + 1)));
  return [first, ...rest].flatMap(parseEvents);
}

function parseEvents(body: unknown): EventInfo[] {
  const content = at(body, 'content');
  if (!Array.isArray(content)) throw new Error('Unexpected World Rugby event list');
  return content.flatMap((event) => {
    const id = str(at(event, 'id'));
    const label = str(at(event, 'label'));
    const start = str(at(event, 'start', 'label'));
    const end = str(at(event, 'end', 'label'));
    return id && label && start && end ? [{ id, label, start, end }] : [];
  });
}

/** Parse a schedule (`matches[]`) into the finished matches. */
function parseSchedule(body: unknown, competition: Competition): Result[] {
  const matches = at(body, 'matches');
  if (!Array.isArray(matches)) throw new Error('Unexpected World Rugby schedule');
  return matches.flatMap((match) => {
    const result = toResult(match, competition);
    return result ? [result] : [];
  });
}

function toResult(match: unknown, competition: Competition): Result | undefined {
  // "C" is completed. Anything else (upcoming "U", cancelled "CC", ...) is not a
  // Result, even when it carries scores: a postponed match can keep stale ones.
  if (at(match, 'status') !== 'C') return undefined;
  const id = str(at(match, 'matchId'));
  const millis = at(match, 'time', 'millis');
  if (!id || typeof millis !== 'number' || Number.isNaN(new Date(millis).getTime())) {
    return undefined;
  }
  const scores = at(match, 'scores');
  const teams = at(match, 'teams');
  if (!Array.isArray(scores) || !Array.isArray(teams)) return undefined;
  // There is no home/away flag: the first team is treated as home.
  const home = team(teams[0], scores[0]);
  const away = team(teams[1], scores[1]);
  if (!home || !away) return undefined;

  return {
    id,
    competitionId: competition.id,
    kickoff: new Date(millis).toISOString(),
    home,
    away,
    matchDetailsUrl: `https://www.world.rugby/matches/${id}?language=en`,
    winner: winnerOf(home, away),
  };
}

function team(raw: unknown, score: unknown): Team | undefined {
  const name = str(at(raw, 'name'));
  if (!name || typeof score !== 'number' || !Number.isFinite(score)) return undefined;
  return { name, shortName: str(at(raw, 'abbreviation')) ?? name, score };
}

function winnerOf(home: Team, away: Team): Winner {
  if (home.score === away.score) return 'draw';
  return home.score > away.score ? 'home' : 'away';
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function at(value: unknown, ...path: (string | number)[]): unknown {
  let current = value;
  for (const key of path) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string | number, unknown>)[key];
  }
  return current;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}
