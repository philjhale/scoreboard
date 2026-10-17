/** Helpers shared by the source adapters (`espn/`, `worldRugby/`). */
import type { Team, Winner } from './types';

/** GET `url` and parse the JSON body. Rejects on a non-2xx status, a timeout or bad JSON. */
export async function getJson(fetchFn: typeof fetch, url: string): Promise<unknown> {
  const response = await fetchFn(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}

/** Read a nested value without throwing on a missing or non-object step. */
export function at(value: unknown, ...path: (string | number)[]): unknown {
  let current = value;
  for (const key of path) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string | number, unknown>)[key];
  }
  return current;
}

/** A non-empty string, else `undefined`. */
export function str(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

export function winnerOf(home: Team, away: Team): Winner {
  if (home.score === away.score) return 'draw';
  return home.score > away.score ? 'home' : 'away';
}
