import getCommonInterface from '../getCommonInterface';
import Snapshot from '../../Snapshot';
import Suite from '../../Suite';

jest.mock('../../Snapshot');
jest.mock('../../Suite');

let suites;
let common;

beforeEach(() => {
  const rootSuite = new Suite();
  suites = [rootSuite];
  common = getCommonInterface(suites);
});

describe('beforeAll', () => {
  it('adds beforeAll hook to the current suite', () => {
    const hook = jest.fn();

    common.beforeAll(hook);

    expect(suites[0].addBeforeAll).toHaveBeenCalledWith(hook);
  });
});

describe('beforeEach', () => {
  it('adds beforeEach hook to the current suite', () => {
    const hook = jest.fn();

    common.beforeEach(hook);

    expect(suites[0].addBeforeEach).toHaveBeenCalledWith(hook);
  });
});

describe('afterEach', () => {
  it('adds afterEach hook to the current suite', () => {
    const hook = jest.fn();

    common.afterEach(hook);

    expect(suites[0].addAfterEach).toHaveBeenCalledWith(hook);
  });
});

describe('afterAll', () => {
  it('adds afterAll hook to the current suite', () => {
    const hook = jest.fn();

    common.afterAll(hook);

    expect(suites[0].addAfterAll).toHaveBeenCalledWith(hook);
  });
});

describe('suite', () => {
  it('rejects when no callback is specified', () => {
    return common
      .suite('suite')
      .then(() => {
        throw new Error('should have rejected');
      })
      .catch(e => expect(e).toBeInstanceOf(TypeError));
  });

  it('adds the suite as a child of the current suite given synchronous callback', async () => {
    await common.suite('suite', jest.fn());

    expect(suites[0].addSuite).toHaveBeenCalledWith(expect.any(Suite));
  });

  it('adds the suite as a child of the current suite given asynchronous callback', async () => {
    const fn = () => new Promise(resolve => setTimeout(resolve, 1));
    await common.suite('suite', fn);

    expect(suites[0].addSuite).toHaveBeenCalledWith(expect.any(Suite));
  });

  it('returns the new suite given synchronous callback', async () => {
    const newSuite = await common.suite('suite', jest.fn());

    expect(newSuite).toEqual(expect.any(Suite));
  });

  it('returns the new suite given asynchronous callback', async () => {
    const fn = () => new Promise(resolve => setTimeout(resolve, 1));
    const newSuite = await common.suite('suite', fn);

    expect(newSuite).toEqual(expect.any(Suite));
  });

  it('sets the new suite as the current suite while executing synchronous callback', async () => {
    let callbackCurrentSuite;
    const callback = jest.fn(() => {
      callbackCurrentSuite = suites[0];
    });

    const newSuite = await common.suite('suite', callback);

    expect(callbackCurrentSuite).toBe(newSuite);
    expect(callbackCurrentSuite).not.toBe(suites[0]);
  });

  it('sets the new suite as the current suite while executing asynchronous callback', async () => {
    let callbackCurrentSuite;
    const callback = () =>
      new Promise(resolve => {
        setTimeout(() => {
          callbackCurrentSuite = suites[0];
          resolve();
        }, 5);
      });

    const newSuite = await common.suite('suite', callback);

    expect(callbackCurrentSuite).toBe(newSuite);
    expect(callbackCurrentSuite).not.toBe(suites[0]);
  });

  it('restores the current suite after executing synchronous callback', async () => {
    const currentSuite = suites[0];

    const newSuite = await common.suite('suite', jest.fn());

    expect(suites[0]).toBe(currentSuite);
    expect(suites[0]).not.toBe(newSuite);
  });

  it('restores the current suite after executing asynchronous callback', async () => {
    const currentSuite = suites[0];
    const fn = () => new Promise(resolve => setTimeout(resolve, 1));

    const newSuite = await common.suite('suite', fn);

    expect(suites[0]).toBe(currentSuite);
    expect(suites[0]).not.toBe(newSuite);
  });
});

describe('snapshot', () => {
  it('adds snapshot to the current suite', () => {
    common.snapshot('snapshot', jest.fn());

    expect(suites[0].addSnapshot).toHaveBeenCalledWith(expect.any(Snapshot));
  });

  it('returns the new snapshot', () => {
    const newSnapshot = common.snapshot('snapshot', jest.fn());

    expect(newSnapshot).toEqual(expect.any(Snapshot));
  });
});
