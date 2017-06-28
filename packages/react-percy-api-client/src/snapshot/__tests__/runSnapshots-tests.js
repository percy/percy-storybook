import runSnapshot from '../runSnapshot';
import runSnapshots from '../runSnapshots';

jest.mock('../runSnapshot', () => jest.fn(() => Promise.resolve()));

it('runs snapshots for each test case', async () => {
  const percyClient = {};
  const build = {};
  const assets = {};
  const testCases = [
        { name: 'test 1' },
        { name: 'test 2' },
        { name: 'test 3' },
        { name: 'test 4' },
        { name: 'test 5' },
        { name: 'test 6' },
        { name: 'test 7' }
  ];
  const renderer = jest.fn();

  await runSnapshots(percyClient, build, testCases, assets, renderer);

  testCases.forEach(testCase =>
        expect(runSnapshot).toHaveBeenCalledWith(percyClient, build, testCase, assets, renderer)
    );
});
