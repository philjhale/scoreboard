# Test fixtures

These ESPN fixtures are recorded from the live API (`node test/fixtures/record.mjs`), each trimmed to a handful of events. Nothing else in a response or a kept event is edited.

- `espn/*-header.json`: scoreboard header (`sports[0].leagues[0].events[]`), served for `site.web.api.espn.com/apis/v2/scoreboard/header`.
- `espn/*-scoreboard-YYYYMMDD.json`: site scoreboard (`events[].competitions[0]`), one file per day, served for `site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard?dates=YYYYMMDD` (the per-day fallback).

Recorded 7 Oct 2026, `tz=Europe/London`:

| Competition | Recorded week | Events |
|---|---|---|
| NBA | 3-7 Oct | Heat at Raptors (before the default Window) and four finals 6-7 Oct |
| NFL | 4-6 Oct | Chiefs at Raiders (before the default Window), Lions at Panthers, Falcons at Saints |
| Premier League | 14-20 Sep | Leeds v Newcastle (before the Window), then Brentford, Spurs, Man City and a Fulham 1-1 Man Utd draw. Site scoreboard fallback for 18-20 Sep |
| Gallagher Premiership | 2-4 Oct | Three finals |
| United Rugby Championship | 2-3 Oct | Connacht v Benetton, Leinster v Sharks, Bulls v Munster |
| Top 14 | 3-4 Oct | Perpignan v Racing 92, Stade Toulousain v Castres, Toulon v Montpellier |
| Six Nations | 7-14 Mar | England v Italy (before the Window), then the three matches of 14 Mar |

The default test clock is 7 Oct 2026, Europe/London (Window 5-7 Oct). The Premier League paused 1-7 Oct and the rugby leagues played nothing 5-7 Oct, so those tests set `PREMIER_LEAGUE_NOW` (18-20 Sep), `GALLAGHER_NOW` (2-4 Oct, also used for the URC and Top 14) or `SIX_NATIONS_NOW` (12-14 Mar).

## World Rugby

`world-rugby/*.json` are recorded from the World Rugby Pulselive API (`node test/fixtures/record-world-rugby.mjs`), the source for the women's rugby Competitions (see `docs/research/world-rugby-pulselive-pwr-wxv.md`). Each response keeps its `content` (event list) or `matches` (schedule) trimmed to a handful of entries. Nothing else is edited.

- `events-page-0.json`, `events-page-1.json`: `GET /event?startDate=2025-01-01&endDate=2026-12-31&pageSize=100`, trimmed to the four events used (PWR 2026 on page 0; PWR Cup, WXV and WXV Challenger on page 1).
- `*-schedule.json`: `GET /event/{id}/schedule?language=en` for each of those events.

Recorded 17 Oct 2026:

| Competition | Matches |
|---|---|
| PWR 2026 | Exeter v Sale (6 Jun), both semi-finals (14 Jun), the final (28 Jun), and Leicester v Harlequins (6 Dec 2025, `status` `U` with scores 28-56) |
| PWR Cup 2026 | Exeter v Leicester (27 Sep), then four finals 2-3 Oct |
| WXV Global Series 2026 | England v Australia (12 Sep), Wales v South Africa (18 Sep), four finals 19 Sep including England 26-26 Canada, and an unplayed USA v Italy (`U`) |
| WXV Global Series Challenger 2026 | Netherlands v Samoa (13 Sep), three finals 19 Sep, and Spain v Brazil (26 Sep, `CC`) |

The tests set `PWR_NOW` (12-14 Jun), `WXV_NOW` (17-19 Sep) or `GALLAGHER_NOW` (2-4 Oct, for the PWR Cup). Unlike ESPN, these recordings include the unplayed and `CC` matches, so no patching is needed. Live matches were never observed, so none is tested.

## What a recording cannot hold

ESPN returns a postponed, scheduled or in-progress match only while it is one, and overtime, extra time and shootouts only when they happen. Where a test needs one, it changes a single recorded event with a helper in `test/helpers/patchEspn.ts` and says so; the rest of the response stays as recorded. The same helper makes the malformed events (missing competitor, missing scores) the adapter must skip.

## Contract

`test/fixtures.contract.test.ts` fails when a recorded event lacks a field the adapter reads. Add a path there whenever the adapter starts reading a new one.

## Re-recording

Run `node test/fixtures/record.mjs` (ESPN) or `node test/fixtures/record-world-rugby.mjs` (World Rugby). Team names, scores and ids are asserted in tests, so ESPN correcting a past result would show up as a failing test.
