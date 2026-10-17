#!/usr/bin/env node
/**
 * Re-records the World Rugby (Pulselive) fixtures from the live API.
 *
 *   node test/fixtures/record-world-rugby.mjs
 *
 * Each fixture is a real response with its list (`content` or `matches`)
 * trimmed to the listed entries. Nothing else in the response (or in a kept
 * entry) is edited. Entries the API no longer returns are reported, not invented.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), 'world-rugby');
const BASE = 'https://api.wr-rims-prod.pulselive.com/rugby/v3';

const eventsUrl = (page) =>
  `${BASE}/event?${new URLSearchParams({ startDate: '2025-01-01', endDate: '2026-12-31', pageSize: '100', page })}`;
const scheduleUrl = (id) => `${BASE}/event/${id}/schedule?language=en`;

// The event list is paged; each page is trimmed to the events used.
const eventPages = {
  'events-page-0.json': { page: '0', ids: ['b65e2413-a9e1-4645-8a31-457c720884f4'] }, // PWR 2026
  'events-page-1.json': {
    page: '1',
    ids: [
      '5ad2f75b-c8ed-401a-96ca-1109149237a2', // PWR Cup 2026
      '14de5b79-3cda-4025-8150-843fa3f19ee8', // WXV Global Series 2026
      '24bf7f35-5e9f-487b-916d-eab79e4453fb', // WXV Global Series Challenger 2026
    ],
  },
};

const schedules = {
  'pwr-schedule.json': {
    id: 'b65e2413-a9e1-4645-8a31-457c720884f4',
    // Exeter v Sale (6 Jun, before the Window), both semi-finals (14 Jun), the final (28 Jun),
    // and Leicester v Harlequins (6 Dec 2025): `status: "U"` with real-looking scores.
    ids: [
      '988218f0-',
      '18b0ef9e-',
      'ea214766-',
      '723d351f-619e-4d99-a1a6-57a7a6544d0c',
      '4dcc5eba-2999-4910-8500-5ba1f3ccf3f1',
    ],
  },
  'pwr-cup-schedule.json': {
    id: '5ad2f75b-c8ed-401a-96ca-1109149237a2',
    // Four finals on 2-3 Oct and Exeter v Leicester (27 Sep, before the Window).
    ids: ['a963c567-', 'd02f5c9f-', 'd114d7d0-', 'be31933c-', '7817efd6-'],
  },
  'wxv-schedule.json': {
    id: '14de5b79-3cda-4025-8150-843fa3f19ee8',
    // England v Australia (12 Sep, before the Window), Wales v South Africa (18 Sep),
    // four finals on 19 Sep including England 26-26 Canada, and an unplayed USA v Italy.
    ids: ['22056030-', '665d571f-', '0f593dea-', '32b3fae2-', '5993dbdb-', 'c703def6-', 'da6a51bd-2422-47d0-bb04-2f870c3bc6b5'],
  },
  'wxv-challenger-schedule.json': {
    id: '24bf7f35-5e9f-487b-916d-eab79e4453fb',
    // Netherlands v Samoa (13 Sep, before the Window), three finals on 19 Sep,
    // and Spain v Brazil (26 Sep): status "CC".
    ids: ['cfd56f9d-', '6685c1bb-', '4b41d516-', '76b581f7-', 'e8a88003-6164-427d-9f1d-85160ce6ce6f'],
  },
};

async function get(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  return response.json();
}

/** Keep entries whose `key` starts with one of `prefixes` (full ids are accepted too). */
function keep(entries, key, prefixes, file) {
  const kept = entries.filter((e) => prefixes.some((p) => e[key].startsWith(p)));
  for (const p of prefixes) if (!kept.some((e) => e[key].startsWith(p))) console.warn(`${file}: ${p} not returned`);
  return kept;
}

for (const [file, { page, ids }] of Object.entries(eventPages)) {
  const body = await get(eventsUrl(page));
  body.content = keep(body.content, 'id', ids, file);
  writeFileSync(join(out, file), `${JSON.stringify(body, null, 2)}\n`);
}
for (const [file, { id, ids }] of Object.entries(schedules)) {
  const body = await get(scheduleUrl(id));
  body.matches = keep(body.matches, 'matchId', ids, file);
  writeFileSync(join(out, file), `${JSON.stringify(body, null, 2)}\n`);
}
