import getRtlRegex from '../getRtlRegex';

it('returns null when rtl and rtl_regex not provided', () => {
  expect(getRtlRegex(null, null)).toEqual(null);
  expect(getRtlRegex(false, null)).toEqual(null);
});

it('returns a regex that matches everything when rtl true', () => {
  expect(getRtlRegex(true, null)).toEqual(/.*/im);
});

it('returns a regex from the rtlRegex param', () => {
  expect(getRtlRegex(false, 'abc')).toEqual(/abc/);
});

it('raises an error when both rtl and rtlRegex are provided', () => {
  expect(() => getRtlRegex(true, 'abc')).toThrow();
});

it('matches all storynames repeatedly when rtl requested - regex is not sticky', () => {
  // This is a regression test.  We had a bug where using the g flag in the rtl regex
  // was making the regex sticky, and causing matches on subsequently shorter names to fail
  let rtlRegex = getRtlRegex(true, null);
  expect(rtlRegex.test('abc')).toEqual(true);
  expect(rtlRegex.test('ab')).toEqual(true);
});
