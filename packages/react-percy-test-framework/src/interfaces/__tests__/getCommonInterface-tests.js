import getCommonInterface from '../getCommonInterface';
import Snapshot from '../../Snapshot';
import Suite from '../../Suite';

let suites;
let common;

beforeEach(() => {
  const rootSuite = new Suite('');
  jest.spyOn(rootSuite, 'addBeforeAll');
  jest.spyOn(rootSuite, 'addBeforeEach');
  jest.spyOn(rootSuite, 'addAfterEach');
  jest.spyOn(rootSuite, 'addAfterAll');
  jest.spyOn(rootSuite, 'addSuite');
  jest.spyOn(rootSuite, 'addSnapshot');

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
  it('adds the suite as a child of the current suite given no callback', async () => {
    await common.suite('suite');

    expect(suites[0].addSuite).toHaveBeenCalledWith(expect.any(Suite));
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

  it('returns the new suite given no callback', async () => {
    const newSuite = await common.suite('suite');

    expect(newSuite).toEqual(expect.any(Suite));
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
  it('throws if a snapshot with the same name has already been added to the current suite', () => {
    common.snapshot('snapshot', jest.fn());

    expect(() => common.snapshot('snapshot', jest.fn())).toThrow();
  });

  it('does not throw if a snapshot with a different name has already been added to the current suite', () => {
    common.snapshot('snapshot 1', jest.fn());

    expect(() => common.snapshot('snapshot 2', jest.fn())).not.toThrow();
  });

  it('throws if a snapshot with the same name has already been added to a different suite with the same name', async () => {
    await common.suite('Suite', () => {
      common.snapshot('snapshot', jest.fn());
    });

    try {
      await common.suite('Suite', () => {
        common.snapshot('snapshot', jest.fn());
      });
    } catch (e) {
      expect(e).toMatchSnapshot();
      return;
    }

    throw new Error('adding second snapshot should have thrown');
  });

  it('does not throw if a snapshot with the same name has already been added to a different suite with a different name', async () => {
    await common.suite('Suite 1', () => {
      common.snapshot('snapshot', jest.fn());
    });

    await common.suite('Suite 2', () => {
      common.snapshot('snapshot', jest.fn());
    });
  });

  it('adds snapshot to the current suite', () => {
    common.snapshot('snapshot', jest.fn());

    expect(suites[0].addSnapshot).toHaveBeenCalledWith(expect.any(Snapshot));
  });

  it('returns the new snapshot', () => {
    const newSnapshot = common.snapshot('snapshot', jest.fn());

    expect(newSnapshot).toEqual(expect.any(Snapshot));
  });
});
