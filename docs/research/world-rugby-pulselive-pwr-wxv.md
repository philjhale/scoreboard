# World Rugby Pulselive API: Premiership Women's Rugby (PWR) and WXV results

All requests were run with `curl` on **2026-10-17** from macOS, with no auth and no special headers unless stated. This is the API behind world.rugby. It is unofficial and undocumented, so everything here is observed behaviour, not a contract. The terms of use have not been read.

Scope: PWR and WXV only. ESPN has neither (for women's rugby it lists only the Women's Rugby World Cup and Olympic Women's Sevens). For ESPN limits see `espn-api-fetch-limits.md`.

## TL;DR

- **Base URL:** `https://api.wr-rims-prod.pulselive.com/rugby/v3`. No key, no auth header.
- **CORS is open:** `access-control-allow-origin: *`, and the preflight allows `GET,OPTIONS`. A browser app can call it directly.
- **Rate limit is 50 requests per 60 seconds**, reported on every response (`x-ratelimit-limit: 50, 50;w=60`, plus `x-ratelimit-remaining` and `x-ratelimit-reset`). One request returned a non-JSON body during testing, probably from hitting this limit. The status code was not captured.
- **One request per competition returns every match, with final scores:** `GET /event/{eventId}/schedule?language=en`. PWR 2026 is 75 matches in one response.
- **Event ids are UUIDs and change every season.** Resolve them at runtime from `GET /event?startDate=&endDate=` by matching the event `label`.
- **Four events cover the scope** (2026 season):

| Competition | List `label` | Event id | Matches |
|---|---|---|---|
| Premiership Women's Rugby | `PWR 2026` | `b65e2413-a9e1-4645-8a31-457c720884f4` | 75 (2025-10-24 to 2026-06-28) |
| PWR Cup | `PWR Cup 2026` | `5ad2f75b-c8ed-401a-96ca-1109149237a2` | 19 (2026-09-19 to 2026-11-07) |
| WXV Global Series | `WXV Global Series 2026` | `14de5b79-3cda-4025-8150-843fa3f19ee8` | 30 (2026-09-12 to 2026-10-31) |
| WXV Global Series Challenger | `WXV Global Series Challenger 2026` | `24bf7f35-5e9f-487b-916d-eab79e4453fb` | 9 (2026-09-13 to 2026-09-26) |

- **Recommendation:** resolve ids with 2 `/event` requests (pages 0 and 1) and cache them for the season. Then fetch 1 `/schedule` request per competition per refresh. That is at most 4 requests for results, well inside the rate limit.

## Endpoints

### 1. List events (competitions)

```
GET /event?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&pageSize=100&page=0
```

```bash
curl -s -H "Origin: http://localhost:5173" \
  "https://api.wr-rims-prod.pulselive.com/rugby/v3/event?startDate=2025-01-01&endDate=2026-12-31&pageSize=100&page=0"
```

Response headers (trimmed):

```
HTTP/2 200
content-type: application/json;charset=UTF-8
access-control-allow-origin: *
x-ratelimit-limit: 50, 50;w=60
```

Response (trimmed to one event of 100):

```json
{
  "pageInfo": { "page": 0, "numPages": 2, "pageSize": 100, "numEntries": 157 },
  "content": [
    {
      "id": "b65e2413-a9e1-4645-8a31-457c720884f4",
      "altId": "b65e2413-a9e1-4645-8a31-457c720884f4",
      "label": "PWR 2026",
      "sport": "wru",
      "start": { "millis": 1761256800000, "gmtOffset": 2.0, "label": "2025-10-24" },
      "end":   { "millis": 1782770400000, "gmtOffset": 2.0, "label": "2026-06-30" },
      "abbr": "",
      "winningTeam": { "id": "3115", "name": "Saracens Women", "abbreviation": "SAR" },
      "eventStatus": { "eventStatusID": 1, "eventStatusName": "Scheduled" },
      "rankingsWeight": 0.0
    }
  ]
}
```

Notes:

- The range `2025-01-01` to `2026-12-31` returned 157 events over 2 pages. **Page through `pageInfo.numPages`**: PWR Cup and both WXV events are on page 1, not page 0. Women's XV events have `sport: "wru"`. Women's sevens is `wrs`.
- Events come back in start-date order. Adding `sort=asc` was tried once and returned a non-JSON body (probably the rate limit), so it is not used.
- `eventStatus.eventStatusName` is `Scheduled` even for PWR 2026, which finished in June. **Do not use it to tell whether a competition is over.** Use the match `status`.
- **The event `label` differs between endpoints.** The list says `PWR 2026` and `WXV Global Series 2026`. Each match's embedded `events[0].label` says `Premiership Womens Rugby 2026` and `WXV 2026`. Match on the list label.

### 2. Event schedule (all matches with scores)

```
GET /event/{eventId}/schedule?language=en
```

```bash
curl -s "https://api.wr-rims-prod.pulselive.com/rugby/v3/event/b65e2413-a9e1-4645-8a31-457c720884f4/schedule?language=en"
```

Top-level keys: `event` (the same object as in the list) and `matches[]`. There is no pagination: all 75 PWR matches came back in one response. `language=en` was always sent. It was not tested without it.

#### Example: completed PWR match (first match of the season)

```json
{
  "matchId": "a5fb3c51-367b-4def-93d5-195fa0f05592",
  "matchAltId": "a5fb3c51-367b-4def-93d5-195fa0f05592",
  "description": "Match 1",
  "eventPhase": "League",
  "eventPhaseId": null,
  "venue": {
    "id": "967",
    "altId": "06ac0994-f365-43d4-a4e0-4058a6ef78d5",
    "name": "Twickenham Stoop",
    "city": "Twickenham",
    "country": "England"
  },
  "time": { "millis": 1761330600000, "gmtOffset": 0.0, "label": "2025-10-24" },
  "attendance": null,
  "teams": [
    { "id": "4262", "altId": "0f6b8a68-2a41-4046-8946-2c4e0f5c8a19", "name": "Harlequins Women", "abbreviation": "HAR", "countryCode": null },
    { "id": "3694", "altId": "33233d4d-0dd6-45f5-b8a0-e81c14e0dc1a", "name": "Loughborough Lightning", "abbreviation": null, "countryCode": null }
  ],
  "scores": [52, 42],
  "kc": null,
  "status": "C",
  "clock": { "secs": 0, "label": "00:00" },
  "outcome": "A",
  "events": [ { "id": "b65e2413-a9e1-4645-8a31-457c720884f4", "label": "Premiership Womens Rugby 2026", "sport": "wru" } ],
  "sport": "WRU",
  "competition": "Premiership Womens Rugby 2026",
  "weather": null,
  "rankingsWeight": null
}
```

#### Example: completed WXV match

Same shape as above, trimmed. England 48, Australia 15:

```json
{
  "matchId": "22056030-c322-43e1-9705-5fff0cbfdde2",
  "description": null,
  "eventPhase": null,
  "venue": { "id": "1339", "name": "CorPacq Stadium", "city": "Manchester", "country": "England" },
  "time": { "millis": 1789221600000, "gmtOffset": 1.0, "label": "2026-09-12" },
  "teams": [
    { "id": "2517", "altId": "73f704bb-53f8-4f1c-94fe-e20e27590300", "name": "England", "abbreviation": "ENG" },
    { "name": "Australia" }
  ],
  "scores": [48, 15],
  "status": "C",
  "outcome": "A",
  "competition": "WXV 2026"
}
```

(The second team is cut down to its name: the other fields were not printed.)

#### Example: unplayed WXV match

```json
{
  "matchId": "da6a51bd-2422-47d0-bb04-2f870c3bc6b5",
  "time": { "millis": 1792274400000, "gmtOffset": -5.0, "label": "2026-10-17" },
  "venue": { "name": "Texas Health Mansfield Stadium", "city": "Texas", "country": "United States" },
  "teams": [
    { "id": "2583", "name": "USA", "abbreviation": "USA" },
    { "id": "2601", "name": "Italy", "abbreviation": "ITA" }
  ],
  "scores": [0, 0],
  "status": "U",
  "outcome": "N",
  "clock": { "secs": 0, "label": "00:00" }
}
```

## Field reference

| Data | Path | Notes |
|---|---|---|
| Match id | `matchId` | UUID |
| Kick-off (UTC ms) | `time.millis` | Use this. `time.label` is a date string in the venue's local time (`gmtOffset` hours), so it can differ from the UTC date |
| First team | `teams[0].name` | No home/away flag. Treating index 0 as home is an assumption |
| Second team | `teams[1].name` | |
| Short name | `teams[n].name` | Same as the full name. `teams[n].abbreviation` (GLO, TRF) is deliberately unused: it is cryptic on mobile and `null` for some PWR teams (for example Loughborough Lightning) |
| Score | `scores[0]`, `scores[1]` | Same order as `teams`. Unplayed matches have `[0, 0]`, not `null` |
| Status | `status` | See below |
| Winner | `outcome` | `A` = `teams[0]` won, `B` = `teams[1]` won, `D` = draw, `N` = none |
| Stage | `eventPhase` | PWR: `League`, `Semi-Finals`, `Final`. PWR Cup: `null`, `Semi-Finals`, `Final`. WXV and WXV Challenger: always `null` |
| Venue | `venue.name`, `venue.city`, `venue.country` | |
| Competition | `competition` | Embedded label, not the list label |

### Status values seen

| `status` | Where seen | Meaning |
|---|---|---|
| `C` | most matches | Completed. Scores are final |
| `U` | upcoming matches (and one odd PWR match, below) | Not played. Scores are `[0, 0]`, `outcome` is `N` |
| `CC` | 1 match (WXV Challenger, Spain v Brazil, 2026-09-26) | Not documented. Probably cancelled. Scores `[0, 0]`, `outcome` `N` |

Counts per competition, as `status`/`outcome`:

| Competition | `C`/`A` | `C`/`B` | `C`/`D` | `U`/`N` | `CC`/`N` |
|---|---|---|---|---|---|
| PWR 2026 | 40 | 29 | 5 | 1 | 0 |
| PWR Cup 2026 | 7 | 5 | 0 | 7 | 0 |
| WXV Global Series 2026 | 10 | 8 | 1 | 11 | 0 |
| WXV Challenger 2026 | 4 | 4 | 0 | 0 | 1 |

**Filter results with `status === "C"`.** Do not filter on non-zero scores or on `outcome`.

## Quirks

- **A PWR match is `U` with real-looking scores.** Leicester Tigers Women v Harlequins Women, 2025-12-06, is `status: "U"`, `scores: [28, 56]`, `outcome: "N"`. It is probably postponed or abandoned, with stale data. Filtering on `status === "C"` correctly excludes it. Filtering on score would not.
- **The `/event` list needs paging.** Always pass `pageSize=100` and read `numPages`. The default page size was not tested.
- **WXV has no stage data.** `eventPhase` is `null` for all 30 WXV matches, so pool and final fixtures cannot be told apart from this field.
- **Team ids are numeric strings** (`"2517"`). `altId` is a UUID. Cross-season stability was not checked.
- **Event ids change each season.** The 2025 PWR Cup is `67c596b8-0ed2-486d-9308-6b097f201803`. The 2026 one is different.

## Wiring it in

Suggested flow, not implemented:

1. On start, fetch `/event?startDate=<year>-01-01&endDate=<year+1>-12-31&pageSize=100` for `page=0` and `page=1`. Keep events whose `label` is one of the four above, and cache the ids for the season.
2. For each id, fetch `/event/{id}/schedule?language=en`.
3. Keep matches with `status === "C"`, then filter `time.millis` against the Window's local boundaries.
4. Map to the app's result type: `teams[0].name` / `teams[1].name`, `scores[0]` / `scores[1]`, `matchId`, `time.millis`.

Differences from ESPN the adapter must handle: there is no date-range query (the schedule returns the whole competition, so the Window filter is client-side), the response has no logos or links, and the competition id is a per-season UUID rather than a fixed slug.

## Risks and open questions

- **Unofficial and undocumented.** It can change or disappear without notice.
- **Terms of use not read.** `https://www.world.rugby/robots.txt` allows all paths, but that is the website, not this API host. Read the World Rugby terms before shipping.
- **The rate limit is assumed to be per client IP.** This was not tested from several IPs. A browser app has one IP per user, so 4 to 6 requests per refresh is fine.
- **Live matches were not observed.** No in-progress `status` was seen, nor how `scores` and `clock` behave during play.
- **Fixtures not recorded.** Per `test/fixtures/README.md`, fixtures must be recorded from the live API. The samples above are trimmed by hand for readability, so record real ones before writing an adapter and contract test.
- **`CC` meaning is inferred.**
- **Other sources:** API-Sports Rugby returned 403 without a key (free plan is 100 requests a day, and it would need a proxy). TheSportsDB was not queried for PWR or WXV.
