import defaults from '../defaults';

describe('testRegex', () => {
  it('matches JS files in `__percy__` directories', () => {
    expect('/package/src/__percy__/foo.js').toMatch(defaults.testRegex);
  });

  it('matches JSX files in `__percy__` directories', () => {
    expect('/package/src/__percy__/foo.jsx').toMatch(defaults.testRegex);
  });

  it('does not match non-JS files in `__percy__` directories', () => {
    expect('/package/src/__percy__/foo.json').not.toMatch(defaults.testRegex);
  });

  it('matches JS files with `.percy` suffix', () => {
    expect('/package/src/foo/foo.percy.js').toMatch(defaults.testRegex);
  });

  it('matches JSX files with `.percy` suffix', () => {
    expect('/package/src/foo/foo.percy.jsx').toMatch(defaults.testRegex);
  });

  it('does not match non-JS files with `.percy` suffix', () => {
    expect('/package/src/foo/foo.percy.json').not.toMatch(defaults.testRegex);
  });

  it('does not match other JS files', () => {
    expect('/package/src/foo/foo.js').not.toMatch(defaults.testRegex);
  });

  it('does not match other JSX files', () => {
    expect('/package/src/foo/foo.jsx').not.toMatch(defaults.testRegex);
  });
});
