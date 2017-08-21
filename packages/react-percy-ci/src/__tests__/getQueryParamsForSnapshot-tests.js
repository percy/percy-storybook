import getQueryParamsForSnapshot from '../getQueryParamsForSnapshot';

it('returns `snapshot` query param set to the snapshot name', () => {
  const snapshot = {
    name: 'foo',
    options: {
      widths: [320, 768],
    },
  };

  const queryParams = getQueryParamsForSnapshot(snapshot);

  expect(queryParams).toEqual({
    snapshot: 'foo',
  });
});
