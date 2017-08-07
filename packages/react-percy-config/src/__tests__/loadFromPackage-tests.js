import loadFromPackage from '../loadFromPackage';

let mockPackage;
jest.mock('/fake/package.json', () => mockPackage, { virtual: true });

beforeEach(() => {
  mockPackage = {
    name: 'fake-package',
  };
  jest.resetModules();
});

it('returns an empty object given package with no percy configuration', () => {
  const config = loadFromPackage('/fake/package.json');

  expect(config).toEqual({});
});

it('returns the percy config given package with percy configuration', () => {
  mockPackage.percy = {
    snapshotRegex: '\\.screenshots.js',
  };

  const config = loadFromPackage('/fake/package.json');

  expect(config).toEqual({
    snapshotRegex: '\\.screenshots.js',
  });
});
