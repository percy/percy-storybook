import getOutputFormat from '../../src/getOutputFormat';

it('returns text when passed text', () => {
  expect(getOutputFormat('TEXT')).toEqual('text');
  expect(getOutputFormat('text')).toEqual('text');
});

it('returns json when passed JSON', () => {
  expect(getOutputFormat('JSON')).toEqual('json');
  expect(getOutputFormat('json')).toEqual('json');
});

it('raises an error if called with an invalid value', () => {
  expect(() => getOutputFormat()).toThrow();
  expect(() => getOutputFormat('xml')).toThrow();
  expect(() => getOutputFormat(7)).toThrow();
  expect(() => getOutputFormat('')).toThrow();
});
