import getMissingResources from '../getMissingResources';

let mockMissing;
jest.mock('../getMissingResourceShas', () => () => mockMissing);

it('filters to resources marked as missing in the response', () => {
  const resources = [
    {
      sha: '1',
    },
    {
      sha: '2',
    },
    {
      sha: '3',
    },
  ];
  mockMissing = ['1', '3'];

  const missingResources = getMissingResources({ missing: mockMissing }, resources);

  expect(missingResources).toEqual([
    {
      sha: '1',
    },
    {
      sha: '3',
    },
  ]);
});
