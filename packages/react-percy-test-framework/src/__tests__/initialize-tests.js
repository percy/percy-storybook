import * as interfaces from '../interfaces';
import initialize from '../';
import Suite from '../Suite';

jest.mock('../interfaces', () => ({ percy: jest.fn() }));

let context;

beforeEach(() => {
  context = {};
});

it('adds percy interface to context', () => {
  initialize(context);

  expect(interfaces.percy).toHaveBeenCalledWith(context, [expect.any(Suite)]);
});

it('returns the root suite', () => {
  const rootSuite = initialize(context);

  expect(rootSuite).toBeInstanceOf(Suite);
});
