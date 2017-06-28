import loadFromPackage from '../loadFromPackage';
import readPercyConfig from '../';

jest.mock('../loadFromPackage', () => jest.fn(() => ({})));

const mockNormalizedConfig = { normalized: true };
jest.mock('../normalize', () => () => mockNormalizedConfig);

it('loads package JSON file from package root', () => {
  readPercyConfig('/package/root');

  expect(loadFromPackage).toHaveBeenCalledWith('/package/root/package.json');
});

it('returns normalized percy config', () => {
  const config = readPercyConfig('/package/root');

  expect(config).toEqual(mockNormalizedConfig);
});
