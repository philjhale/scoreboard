import gallagherPremiershipHeader from '../fixtures/espn/gallagher-premiership-header.json';
import nbaHeader from '../fixtures/espn/nba-header.json';
import nflHeader from '../fixtures/espn/nfl-header.json';
import premierLeagueHeader from '../fixtures/espn/premier-league-header.json';
import sixNationsHeader from '../fixtures/espn/six-nations-header.json';
import top14Header from '../fixtures/espn/top-14-header.json';
import unitedRugbyChampionshipHeader from '../fixtures/espn/united-rugby-championship-header.json';
import worldRugbyEventsPage0 from '../fixtures/world-rugby/events-page-0.json';
import worldRugbyEventsPage1 from '../fixtures/world-rugby/events-page-1.json';
import pwrCupSchedule from '../fixtures/world-rugby/pwr-cup-schedule.json';
import pwrSchedule from '../fixtures/world-rugby/pwr-schedule.json';
import wxvChallengerSchedule from '../fixtures/world-rugby/wxv-challenger-schedule.json';
import wxvSchedule from '../fixtures/world-rugby/wxv-schedule.json';
import premierLeague20260918 from '../fixtures/espn/premier-league-scoreboard-20260918.json';
import premierLeague20260919 from '../fixtures/espn/premier-league-scoreboard-20260919.json';
import premierLeague20260920 from '../fixtures/espn/premier-league-scoreboard-20260920.json';

/**
 * A fake `fetch` that answers ESPN and World Rugby URLs from fixtures.
 *
 * - Header requests (`/apis/v2/scoreboard/header?sport=&league=`) are answered
 *   from `header["sport/league"]`.
 * - Site scoreboard requests (`/apis/site/v2/sports/{sport}/{league}/scoreboard?dates=`)
 *   are answered from `scoreboard["sport/league/YYYYMMDD"]`.
 * - World Rugby event list requests (`/rugby/v3/event`) are answered from
 *   `worldRugby.events[page]`, schedule requests (`/rugby/v3/event/{id}/schedule`)
 *   from `worldRugby.schedules[id]`.
 * - Anything else gets an HTTP 404, and a URL matched by `failWhen` an HTTP 500.
 *
 * Every requested URL is recorded in `requests` (parsed), in order.
 */
export interface FakeEspnOptions {
  header?: Record<string, unknown>;
  scoreboard?: Record<string, unknown>;
  worldRugby?: WorldRugbyFixtures;
}

export interface WorldRugbyFixtures {
  /** Event list pages, by page number. */
  events: unknown[];
  /** Schedules, by event id. */
  schedules: Record<string, unknown>;
}

export interface FakeEspn {
  fetch: typeof fetch;
  requests: URL[];
  headerRequests(): URL[];
  worldRugbyRequests(): URL[];
  failWhen(predicate: (url: URL) => boolean): void;
  stopFailing(): void;
}

export const defaultHeaderFixtures: Record<string, unknown> = {
  'basketball/nba': nbaHeader,
  'football/nfl': nflHeader,
  'soccer/eng.1': premierLeagueHeader,
  'rugby/267979': gallagherPremiershipHeader,
  'rugby/270557': unitedRugbyChampionshipHeader,
  'rugby/270559': top14Header,
  'rugby/180659': sixNationsHeader,
};

export const defaultScoreboardFixtures: Record<string, unknown> = {
  'soccer/eng.1/20260918': premierLeague20260918,
  'soccer/eng.1/20260919': premierLeague20260919,
  'soccer/eng.1/20260920': premierLeague20260920,
};

export const defaultWorldRugbyFixtures: WorldRugbyFixtures = {
  events: [worldRugbyEventsPage0, worldRugbyEventsPage1],
  schedules: {
    'b65e2413-a9e1-4645-8a31-457c720884f4': pwrSchedule, // PWR 2026
    '5ad2f75b-c8ed-401a-96ca-1109149237a2': pwrCupSchedule, // PWR Cup 2026
    '14de5b79-3cda-4025-8150-843fa3f19ee8': wxvSchedule, // WXV Global Series 2026
    '24bf7f35-5e9f-487b-916d-eab79e4453fb': wxvChallengerSchedule, // WXV Global Series Challenger 2026
  },
};

const WORLD_RUGBY_HOST = 'api.wr-rims-prod.pulselive.com';

export function createFakeEspn(options: FakeEspnOptions = {}): FakeEspn {
  const header = options.header ?? defaultHeaderFixtures;
  const scoreboard = options.scoreboard ?? defaultScoreboardFixtures;
  const worldRugby = options.worldRugby ?? defaultWorldRugbyFixtures;
  const requests: URL[] = [];
  let failing: ((url: URL) => boolean) | undefined;

  function answer(url: URL): Response {
    if (failing?.(url)) return new Response('fake failure', { status: 500 });

    if (url.host === WORLD_RUGBY_HOST) {
      if (url.pathname === '/rugby/v3/event') {
        const body = worldRugby.events[Number(url.searchParams.get('page'))];
        // Past the last page the API answers with an empty list.
        return json(body ?? { pageInfo: { page: 0, numPages: 0, pageSize: 100, numEntries: 0 }, content: [] });
      }
      const schedule = url.pathname.match(/^\/rugby\/v3\/event\/([^/]+)\/schedule$/);
      const body = schedule && worldRugby.schedules[schedule[1]!];
      if (body !== undefined && body !== null) return json(body);
      return new Response('not found', { status: 404 });
    }

    if (url.pathname === '/apis/v2/scoreboard/header') {
      const key = `${url.searchParams.get('sport')}/${url.searchParams.get('league')}`;
      const body = header[key];
      if (body !== undefined) return json(body);
    }

    const site = url.pathname.match(/^\/apis\/site\/v2\/sports\/([^/]+)\/([^/]+)\/scoreboard$/);
    if (site) {
      const body = scoreboard[`${site[1]}/${site[2]}/${url.searchParams.get('dates')}`];
      if (body !== undefined) return json(body);
    }

    return new Response('not found', { status: 404 });
  }

  const fakeFetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    requests.push(url);
    // Yield so callers observe a genuinely asynchronous response.
    await Promise.resolve();
    return answer(url);
  };

  return {
    fetch: fakeFetch as typeof fetch,
    requests,
    headerRequests: () => requests.filter((u) => u.pathname === '/apis/v2/scoreboard/header'),
    worldRugbyRequests: () => requests.filter((u) => u.host === WORLD_RUGBY_HOST),
    failWhen(predicate) {
      failing = predicate;
    },
    stopFailing() {
      failing = undefined;
    },
  };
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
