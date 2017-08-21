import { GlobalVariables } from '../constants';

jest.mock('@percy-io/react-percy-test-framework', () => jest.fn(() => mockSuite));

let mockSuite;

beforeEach(() => {
  jest.resetModules();

  mockSuite = { mock: 'suite' };
});

it('sets global variable with the root suite', () => {
  require('../framework');

  expect(global[GlobalVariables.rootSuite]).toBe(mockSuite);
});
