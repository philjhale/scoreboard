# Use World Rugby's Pulselive API for women's rugby

ESPN has neither Premiership Women's Rugby (PWR) nor WXV, so those Competitions come from the unofficial API behind world.rugby (`api.wr-rims-prod.pulselive.com/rugby/v3`). It needs no key and sends `Access-Control-Allow-Origin: *`, so it is called directly from the browser like ESPN (ADR 0001). The same accepted risks apply: it is undocumented, can change without notice, and its terms of use have not been read. The research is in `docs/research/world-rugby-pulselive-pwr-wxv.md`.

A Competition's `source` has a `kind`, and each kind has its own adapter (`src/core/espn/`, `src/core/worldRugby/`).

## Consequences

- There is no date-range query. A Competition's schedule is one request that returns every match of the season, so the Window is applied client-side, and past days are cached in the browser as for ESPN.
- Event ids are UUIDs that change each season. A World Rugby source names the event label (`PWR`), and the adapter resolves the id from the paged `/event` list, matching `<name> <year>` exactly. The list is requested once per page and shared by all World Rugby Competitions (it is two pages at present). Only events overlapping the Window have their schedule fetched.
- A match is a Result only when `status` is `C`. A postponed match can be `U` with stale scores, and `CC` is probably cancelled.
- The winner comes from the scores, as for ESPN, not from `outcome` (`A` or `B` for the first or second team; its value for a draw was not seen). A contract test checks the two agree.
- Past days are cached once they are two days old, but a match can show `U` for a while after it finishes. If World Rugby marks it `C` later than that, the cached day stays without it.
- There is no home/away flag, so the first team is shown as home.
- There are no logos and no match links. Match Details points to `https://www.world.rugby/match/<matchId>`, which redirects to the match page. The earlier `/matches/<matchId>?language=en` pattern was unverified and 404s.
- The rate limit is 50 requests per 60 seconds per client. A refresh makes one event-list request per page (2 now) plus 1 schedule request per event overlapping the Window, which is normally 1 per Competition. A Window that crosses a year boundary can match two editions of a Competition.
