import getIframePath from '../../src/getIframePath';
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
      'iframe.html': 'file content here'
    }
  });
  try {
    if (process.platform === 'win32') {
      expect(getIframePath({ buildDir: '/tmp-test' })).toMatch('\\tmp-test\\iframe.html');
    } else {
      expect(getIframePath({ buildDir: '/tmp-test' })).toBe('/tmp-test/iframe.html');
    }
  } finally {
    mock.restore();
  }
});
