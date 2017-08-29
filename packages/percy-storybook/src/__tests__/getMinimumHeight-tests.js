import getMinimumHeight from '../getMinimumHeight';

it('returns number when passed a number ', () => {
  expect(getMinimumHeight(100)).toEqual(100);
});

it('returns number when passed a number string', () => {
  expect(getMinimumHeight('100')).toEqual(100);
});

it('raises an error if called with non-integer string', () => {
  expect(() => getMinimumHeight()).toThrow();
  expect(() => getMinimumHeight('3.3')).toThrow();
  expect(() => getMinimumHeight('1280px')).toThrow();
  expect(() => getMinimumHeight('100,200')).toThrow();
});
