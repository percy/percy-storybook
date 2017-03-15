import defaults from '../defaults';

describe('testRegex', () => {

    it('matches JS files in `__screenshots__` directories', () => {
        expect('/package/src/__screenshots__/foo.js').toMatch(defaults.testRegex);
    });

    it('matches JSX files in `__screenshots__` directories', () => {
        expect('/package/src/__screenshots__/foo.jsx').toMatch(defaults.testRegex);
    });

    it('does not match non-JS files in `__screenshots__` directories', () => {
        expect('/package/src/__screenshots__/foo.json').not.toMatch(defaults.testRegex);
    });

    it('matches JS files with `.screenshot` suffix', () => {
        expect('/package/src/foo/foo.screenshot.js').toMatch(defaults.testRegex);
    });

    it('matches JSX files with `.screenshot` suffix', () => {
        expect('/package/src/foo/foo.screenshot.jsx').toMatch(defaults.testRegex);
    });

    it('does not match non-JS files with `.screenshot` suffix', () => {
        expect('/package/src/foo/foo.screenshot.json').not.toMatch(defaults.testRegex);
    });

    it('matches JS files with `.screenshots` suffix', () => {
        expect('/package/src/foo/foo.screenshots.js').toMatch(defaults.testRegex);
    });

    it('matches JSX files with `.screenshots` suffix', () => {
        expect('/package/src/foo/foo.screenshots.jsx').toMatch(defaults.testRegex);
    });

    it('does not match non-JS files with `.screenshots` suffix', () => {
        expect('/package/src/foo/foo.screenshots.json').not.toMatch(defaults.testRegex);
    });

    it('does not match other JS files', () => {
        expect('/package/src/foo/foo.js').not.toMatch(defaults.testRegex);
    });

    it('does not match other JSX files', () => {
        expect('/package/src/foo/foo.jsx').not.toMatch(defaults.testRegex);
    });

});
