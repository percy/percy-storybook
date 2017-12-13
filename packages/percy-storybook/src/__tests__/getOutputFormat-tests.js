import getOutputFormat from '../getOutputFormat';

it('returns text when passed text', () => {
  expect(getOutputFormat('text')).toEqual('text');
});

it('returns JSON when passed JSON', () => {
  expect(getOutputFormat('JSON')).toEqual('JSON');
});

it('raises an error if called with an invalid value', () => {
  expect(() => getOutputFormat()).toThrow();
  expect(() => getOutputFormat('xml')).toThrow();
  expect(() => getOutputFormat(7)).toThrow();
  expect(() => getOutputFormat('')).toThrow();
});
