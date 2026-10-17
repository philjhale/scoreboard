/** Domain types. Terms follow GLOSSARY.md. No React here. */

export interface Sport {
  id: string;
  name: string;
  /** Lower comes first. */
  order: number;
}

/** Where a Competition's Results come from. */
export interface EspnSource {
  kind: 'espn';
  /** ESPN sport slug, e.g. `basketball`. */
  sport: string;
  /** ESPN league slug or id, e.g. `nba` or `267979`. */
  league: string;
}

/**
 * World Rugby's Pulselive API. Its events (competition editions) have a new id
 * every season, so a Competition names the event `label` it appears under.
 */
export interface WorldRugbySource {
  kind: 'world-rugby';
  /** The event label without its year, e.g. `PWR` for `PWR 2026`. */
  eventName: string;
}

interface CompetitionBase {
  id: string;
  sportId: string;
  name: string;
}

export interface EspnCompetition extends CompetitionBase {
  source: EspnSource;
}

export interface WorldRugbyCompetition extends CompetitionBase {
  source: WorldRugbySource;
}

export type Competition = EspnCompetition | WorldRugbyCompetition;

export interface CompetitionConfig {
  sports: Sport[];
  competitions: Competition[];
}

export interface Team {
  name: string;
  shortName: string;
  logoUrl?: string;
  score: number;
}

export type Winner = 'home' | 'away' | 'draw';

export interface Result {
  id: string;
  competitionId: string;
  /** Kick-off instant, ISO 8601 UTC. */
  kickoff: string;
  home: Team;
  away: Team;
  /** E.g. `OT`, `2OT`, `AET`, as given by the source. */
  extraTime?: string;
  matchDetailsUrl: string;
  winner: Winner;
}

export const WINDOW_DAYS = [1, 3, 7, 14] as const;
export type WindowDays = (typeof WINDOW_DAYS)[number];
export const DEFAULT_WINDOW: WindowDays = 3;

/** A calendar date in the viewer's timezone, `YYYY-MM-DD`. */
export type LocalDate = string;

/** A Window resolved against a "now" and timezone. */
export interface ResolvedWindow {
  /** Oldest first; the last entry is today. */
  dates: LocalDate[];
  end: LocalDate;
}
