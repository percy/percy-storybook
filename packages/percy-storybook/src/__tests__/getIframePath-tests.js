import getIframePath from '../getIframePath';
const mock = require('mock-fs');

it('raises an error if called without a buildDir', () => {
  expect(() => getIframePath()).toThrow();
  expect(() => getIframePath({})).toThrow();
});

it("raises an error if storybook doesn't exist in buildDir", () => {
  expect(() => getIframePath({ buildDir: '.' })).toThrow();
});

it('returns the iframe path when the storybook exists', () => {
  mock({
    '/tmp-test': {
      'iframe.html': 'file content here',
    },
  });
  expect(getIframePath({ buildDir: '/tmp-test' })).toEqual('/tmp-test/iframe.html');
  mock.restore();
});
