import getRtlRegex from '../getRtlRegex';

it('returns null when rtl and rtl_regex not provided', () => {
  expect(getRtlRegex(null, null)).toEqual(null);
  expect(getRtlRegex(false, null)).toEqual(null);
});

it('returns a regex that matches everything when rtl true', () => {
  expect(getRtlRegex(true, null)).toEqual(/.*/gim);
});

it('returns a regex from the rtlRegex param', () => {
  expect(getRtlRegex(false, 'abc')).toEqual(/abc/);
});

it('raises an error when both rtl and rtlRegex are provided', () => {
  expect(() => getRtlRegex(true, 'abc')).toThrow();
});
