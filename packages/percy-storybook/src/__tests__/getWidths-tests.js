import getWidths from '../getWidths';

it('returns empty array for a nil or empty string', () => {
  expect(getWidths()).toEqual([]);
  expect(getWidths('')).toEqual([]);
});

it('returns numbers in an array for a comma delimited list of numbers', () => {
  expect(getWidths('1')).toEqual([1]);
  expect(getWidths('380,1280')).toEqual([380, 1280]);
});

it('raises an error if called with non-numbers', () => {
  expect(() => getWidths('1280px')).toThrow();
  expect(() => getWidths('380px,1280px')).toThrow();
});
