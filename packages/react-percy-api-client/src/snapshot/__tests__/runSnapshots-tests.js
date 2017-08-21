import runSnapshot from '../runSnapshot';
import runSnapshots from '../runSnapshots';

jest.mock('../runSnapshot', () => jest.fn(() => Promise.resolve()));

it('runs percy snapshots for each snapshot', async () => {
  const percyClient = {};
  const build = {};
  const snapshots = [
    { name: 'snapshot 1' },
    { name: 'snapshot 2' },
    { name: 'snapshot 3' },
    { name: 'snapshot 4' },
    { name: 'snapshot 5' },
    { name: 'snapshot 6' },
    { name: 'snapshot 7' },
  ];
  const html = '<html><body>some html</body></html>';
  const getQueryParams = jest.fn();

  await runSnapshots(percyClient, build, snapshots, html, getQueryParams);

  snapshots.forEach(snapshot =>
    expect(runSnapshot).toHaveBeenCalledWith(percyClient, build, snapshot, html, getQueryParams),
  );
});
