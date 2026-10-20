import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFakeEspn, defaultWorldRugbyFixtures } from './helpers/fakeEspn';
import { GALLAGHER_NOW, PWR_NOW, WXV_NOW, renderApp } from './helpers/renderApp';

const PWR_ID = 'b65e2413-a9e1-4645-8a31-457c720884f4';
const WXV_ID = '14de5b79-3cda-4025-8150-843fa3f19ee8';

async function resultRows(competition: string) {
  const region = await screen.findByRole('region', { name: competition });
  return within(region).findAllByRole('listitem');
}

/** A Competition that has finished loading, whether or not it has Results. */
async function settled(name: string) {
  const competition = within(await screen.findByRole('region', { name }));
  await waitFor(() => expect(competition.queryByRole('status')).not.toBeInTheDocument());
  return competition;
}

describe('Women’s rugby Results from World Rugby', () => {
  it.each([
    [
      "Premiership Women's Rugby",
      PWR_NOW,
      ['Saracens Women', 'Gloucester-Hartpury Women'],
    ],
    ['PWR Cup', GALLAGHER_NOW, ['Trailfinders Women', 'Sale Sharks Women', 'Bristol Bears Women', 'Loughborough Lightning']],
    [
      'WXV',
      WXV_NOW,
      ['Scotland', 'France', 'England', 'Italy', 'Wales'],
    ],
    ['WXV Challenger', WXV_NOW, ['Brazil', 'Fiji', 'Samoa']],
  ])('shows finished %s Results in the Window, newest first', async (competition, now, homes) => {
    renderApp({ now });

    const rows = await resultRows(competition);
    expect(rows.map((r) => r.textContent)).toEqual(homes.map((home) => expect.stringContaining(home)));
  });

  it('shows both teams, their final scores and the winner in bold', async () => {
    renderApp({ now: PWR_NOW });

    const [semiFinal] = await resultRows("Premiership Women's Rugby");
    expect(semiFinal).toHaveTextContent('Saracens Women');
    expect(semiFinal).toHaveTextContent('Exeter Chiefs Women');
    expect(within(semiFinal!).getByText('40').closest('strong')).not.toBeNull();
    expect(within(semiFinal!).getByText('38').closest('strong')).toBeNull();
  });

  it('shows full team names, not abbreviations, on narrow screens too', async () => {
    renderApp({ now: PWR_NOW });

    const [semiFinal] = await resultRows("Premiership Women's Rugby");
    const shortNames = Array.from(semiFinal!.querySelectorAll('.team-name-short')).map((el) => el.textContent);
    expect(shortNames).toEqual(['Saracens Women', 'Exeter Chiefs Women']);
  });

  it('shows a draw with neither team in bold', async () => {
    renderApp({ now: WXV_NOW });

    const rows = await resultRows('WXV');
    const draw = rows.find((r) => r.textContent?.includes('England'))!;
    expect(within(draw).getAllByText('26')).toHaveLength(2);
    expect(draw.querySelector('strong')).toBeNull();
  });

  it('links each Result to its World Rugby match page', async () => {
    renderApp({ now: PWR_NOW });

    const [semiFinal] = await resultRows("Premiership Women's Rugby");
    expect(within(semiFinal!).getByRole('link', { name: 'Match Details' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^https:\/\/www\.world\.rugby\/match\/ea214766-[\w-]+$/),
    );
  });

  it('leaves out finished matches before the Window', async () => {
    renderApp({ now: WXV_NOW });
    await resultRows('WXV');

    expect(screen.queryAllByText('Australia', { exact: false })).not.toHaveLength(0); // France v Australia, 19 Sep
    expect(screen.queryByText('Manchester')).not.toBeInTheDocument();
    // One span each for the full and short name; not also England v Australia, 12 Sep
    expect(screen.queryAllByText('England')).toHaveLength(2);
  });

  it('leaves out matches that are not completed, even with scores', async () => {
    // Leicester v Harlequins (6 Dec 2025) is "U" with scores 28-56: probably postponed.
    renderApp({ now: '2025-12-06T20:00:00Z' });

    const pwr = await settled("Premiership Women's Rugby");
    expect(pwr.queryByRole('listitem')).not.toBeInTheDocument();
    expect(pwr.getByText(/No results/)).toBeInTheDocument();
  });

  it('leaves out an unplayed match', async () => {
    // WXV: USA v Italy is "U" (17 Oct, later that day).
    renderApp({ now: '2026-10-17T12:00:00Z' });

    const wxv = await settled('WXV');
    expect(wxv.queryByText('USA')).not.toBeInTheDocument();
  });

  it('leaves out a "CC" match (probably cancelled)', async () => {
    // WXV Challenger: Spain v Brazil (26 Sep) is "CC" with scores 0-0.
    renderApp({ now: '2026-09-26T21:00:00Z' });

    const challenger = await settled('WXV Challenger');
    expect(challenger.queryByRole('listitem')).not.toBeInTheDocument();
    expect(challenger.getByText(/No results/)).toBeInTheDocument();
  });
});

describe('Kick-off days in the viewer’s timezone', () => {
  const wxvSchedule = defaultWorldRugbyFixtures.schedules[WXV_ID]! as { matches: { time: { millis: number } }[] };
  const kickingOffAt = (...instants: string[]) => ({
    ...defaultWorldRugbyFixtures,
    schedules: {
      ...defaultWorldRugbyFixtures.schedules,
      [WXV_ID]: {
        ...wxvSchedule,
        matches: instants.map((instant, i) => ({
          ...wxvSchedule.matches[i]!,
          time: { ...wxvSchedule.matches[i]!.time, millis: Date.parse(instant) },
        })),
      },
    },
  });

  // The default Window ends 19 Sep and covers 3 local days. In London (BST) a
  // kick-off at 23:30Z on the 16th is already the 17th, but 22:30Z is still the 16th.
  it('includes a late kick-off that is the first Window day locally but the day before in UTC', async () => {
    const espn = createFakeEspn({ worldRugby: kickingOffAt('2026-09-16T23:30:00Z') });
    renderApp({ espn, now: WXV_NOW });

    const wxv = await settled('WXV');
    expect(wxv.getAllByRole('listitem')).toHaveLength(1);
  });

  it('leaves out a late kick-off that is the day before the Window locally', async () => {
    const espn = createFakeEspn({ worldRugby: kickingOffAt('2026-09-16T22:30:00Z') });
    renderApp({ espn, now: WXV_NOW });

    const wxv = await settled('WXV');
    expect(wxv.queryByRole('listitem')).not.toBeInTheDocument();
  });
});

describe('Fetching from World Rugby', () => {
  it('lists the events once for every Competition, then fetches only the schedules in the Window', async () => {
    const espn = createFakeEspn();
    renderApp({ espn, now: GALLAGHER_NOW });
    await resultRows('PWR Cup');
    await settled('WXV');

    const requests = espn.worldRugbyRequests();
    const lists = requests.filter((u) => u.pathname === '/rugby/v3/event');
    expect(lists.map((u) => u.searchParams.get('page')).sort()).toEqual(['0', '1']);
    expect(lists[0]!.searchParams.get('startDate')).toBe('2025-01-01');
    expect(lists[0]!.searchParams.get('endDate')).toBe('2026-12-31');
    expect(lists[0]!.searchParams.get('pageSize')).toBe('100');
    // PWR 2026 ended in June and the Challenger in September: neither is fetched.
    expect(
      requests
        .filter((u) => u.pathname.endsWith('/schedule'))
        .map((u) => u.pathname.split('/')[4])
        .sort(),
    ).toEqual(['14de5b79-3cda-4025-8150-843fa3f19ee8', '5ad2f75b-c8ed-401a-96ca-1109149237a2']);
  });

  it('finds an event whose season started the year before its label', async () => {
    const espn = createFakeEspn();
    renderApp({ espn, now: PWR_NOW });
    await resultRows("Premiership Women's Rugby");

    expect(espn.worldRugbyRequests().some((u) => u.pathname.includes(PWR_ID))).toBe(true);
  });

  it('shows an error for one Competition when its schedule fails, and recovers on Retry', async () => {
    const espn = createFakeEspn();
    espn.failWhen((url) => url.pathname.includes(WXV_ID));
    const { user } = renderApp({ espn, now: WXV_NOW });

    const wxv = within(await screen.findByRole('region', { name: 'WXV' }));
    expect(await wxv.findByText("Couldn't load WXV results.")).toBeInTheDocument();
    expect(await resultRows('WXV Challenger')).not.toHaveLength(0);

    espn.stopFailing();
    await user.click(wxv.getByRole('button', { name: /retry/i }));
    expect(await wxv.findAllByRole('listitem')).not.toHaveLength(0);
  });

  it('shows an error when the event list cannot be loaded, and asks again on Retry', async () => {
    const espn = createFakeEspn();
    espn.failWhen((url) => url.pathname === '/rugby/v3/event');
    const { user } = renderApp({ espn, now: PWR_NOW });

    const pwr = within(await screen.findByRole('region', { name: "Premiership Women's Rugby" }));
    expect(await pwr.findByText("Couldn't load Premiership Women's Rugby results.")).toBeInTheDocument();

    espn.stopFailing();
    await user.click(pwr.getByRole('button', { name: /retry/i }));
    expect(await pwr.findAllByRole('listitem')).toHaveLength(2);
  });

  it('shows an error when the response is not what the adapter expects', async () => {
    const espn = createFakeEspn({
      worldRugby: { ...defaultWorldRugbyFixtures, schedules: { [PWR_ID]: { unexpected: true } } },
    });
    renderApp({ espn, now: PWR_NOW });

    const pwr = within(await screen.findByRole('region', { name: "Premiership Women's Rugby" }));
    expect(await pwr.findByText("Couldn't load Premiership Women's Rugby results.")).toBeInTheDocument();
  });
});
