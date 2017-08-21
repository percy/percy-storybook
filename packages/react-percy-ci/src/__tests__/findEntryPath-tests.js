import findEntryPath from '../findEntryPath';

it('returns path for JS asset with the given file name', () => {
  const assets = {
    '/static/foo.css': 'some css',
    '/static/bar.js': 'some js',
    '/static/foo.js': 'some js',
  };

  const entryPath = findEntryPath(assets, 'foo');

  expect(entryPath).toBe('/static/foo.js');
});

it('returns undefined when no JS asset has the given file name', () => {
  const assets = {
    '/static/foo.css': 'some css',
    '/static/bar.js': 'some js',
  };

  const entryPath = findEntryPath(assets, 'foo');

  expect(entryPath).toBeUndefined();
});
