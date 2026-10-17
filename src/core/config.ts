import type { CompetitionConfig } from './types';

/**
 * Sports and Competitions shown by the app. Adding a Competition (or a Sport)
 * is a config-only change.
 */
export const competitionConfig: CompetitionConfig = {
  sports: [
    { id: 'basketball', name: 'Basketball', order: 1 },
    { id: 'american-football', name: 'American Football', order: 2 },
    { id: 'football', name: 'Football', order: 3 },
    { id: 'rugby-union', name: 'Rugby Union', order: 4 },
    { id: 'womens-rugby-union', name: "Women's Rugby Union", order: 5 },
  ],
  competitions: [
    {
      id: 'nba',
      sportId: 'basketball',
      name: 'NBA',
      source: { kind: 'espn', sport: 'basketball', league: 'nba' },
    },
    {
      id: 'nfl',
      sportId: 'american-football',
      name: 'NFL',
      source: { kind: 'espn', sport: 'football', league: 'nfl' },
    },
    {
      id: 'premier-league',
      sportId: 'football',
      name: 'Premier League',
      source: { kind: 'espn', sport: 'soccer', league: 'eng.1' },
    },
    {
      id: 'gallagher-premiership',
      sportId: 'rugby-union',
      name: 'Gallagher Premiership',
      // ESPN identifies this league by a numeric id, not a readable slug.
      source: { kind: 'espn', sport: 'rugby', league: '267979' },
    },
    {
      id: 'united-rugby-championship',
      sportId: 'rugby-union',
      name: 'United Rugby Championship',
      source: { kind: 'espn', sport: 'rugby', league: '270557' },
    },
    {
      id: 'top-14',
      sportId: 'rugby-union',
      name: 'Top 14',
      source: { kind: 'espn', sport: 'rugby', league: '270559' },
    },
    {
      id: 'six-nations',
      sportId: 'rugby-union',
      name: 'Six Nations',
      source: { kind: 'espn', sport: 'rugby', league: '180659' },
    },
    {
      id: 'premiership-womens-rugby',
      sportId: 'womens-rugby-union',
      name: "Premiership Women's Rugby",
      source: { kind: 'world-rugby', eventName: 'PWR' },
    },
    {
      id: 'pwr-cup',
      sportId: 'womens-rugby-union',
      name: 'PWR Cup',
      source: { kind: 'world-rugby', eventName: 'PWR Cup' },
    },
    {
      id: 'wxv',
      sportId: 'womens-rugby-union',
      name: 'WXV',
      source: { kind: 'world-rugby', eventName: 'WXV Global Series' },
    },
    {
      id: 'wxv-challenger',
      sportId: 'womens-rugby-union',
      name: 'WXV Challenger',
      source: { kind: 'world-rugby', eventName: 'WXV Global Series Challenger' },
    },
  ],
};
