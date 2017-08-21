import React from 'react';
import Suite from '../Suite';

let executed;
let suite;
let parent;

const execute = name => executed.push(name);
const executeAsync = (name, delay) =>
  new Promise(resolve => {
    setTimeout(() => {
      execute(name);
      resolve();
    }, delay);
  });

const givenSyncBeforeAll = (targetSuite, name) => targetSuite.addBeforeAll(() => execute(name));
const givenAsyncBeforeAll = (targetSuite, name, delay = 1) =>
  targetSuite.addBeforeAll(() => executeAsync(name, delay));

const givenSyncBeforeEach = (targetSuite, name) => targetSuite.addBeforeEach(() => execute(name));
const givenAsyncBeforeEach = (targetSuite, name, delay = 1) =>
  targetSuite.addBeforeEach(() => executeAsync(name, delay));

const givenSyncAfterEach = (targetSuite, name) => targetSuite.addAfterEach(() => execute(name));
const givenAsyncAfterEach = (targetSuite, name, delay = 1) =>
  targetSuite.addAfterEach(() => executeAsync(name, delay));

const givenSyncAfterAll = (targetSuite, name) => targetSuite.addAfterAll(() => execute(name));
const givenAsyncAfterAll = (targetSuite, name, delay = 1) =>
  targetSuite.addAfterAll(() => executeAsync(name, delay));

const givenSyncSnapshot = (targetSuite, name) =>
  targetSuite.addSnapshot({
    fullTitle: () => name,
    getMarkup: () => {
      execute(name);
      return {};
    },
  });
const givenAsyncSnapshot = (targetSuite, name, delay = 1) =>
  targetSuite.addSnapshot({
    fullTitle: () => name,
    getMarkup: async () => {
      await executeAsync(name, delay);
      return {};
    },
  });

beforeEach(() => {
  executed = [];
  suite = new Suite('title');
  suite.parent = parent = new Suite('parent');
});

describe('beforeAll hooks', () => {
  it('executes synchronous beforeAll hooks in the order specified in the suite before rendering snapshot given snapshot in suite', async () => {
    givenSyncBeforeAll(suite, 'beforeAll 1');
    givenSyncBeforeAll(suite, 'beforeAll 2');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['beforeAll 1', 'beforeAll 2', 'snapshot']);
  });

  it('executes asynchronous beforeAll hooks in the order specified in the suite before rendering snapshot given snapshot in suite', async () => {
    givenAsyncBeforeAll(suite, 'beforeAll 1', 2);
    givenAsyncBeforeAll(suite, 'beforeAll 2', 1);
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['beforeAll 1', 'beforeAll 2', 'snapshot']);
  });

  it('executes synchronous beforeAll hook before beforeEach hooks in suite before rendering snapshot given snapshot in suite', async () => {
    givenSyncBeforeAll(suite, 'beforeAll');
    givenSyncBeforeEach(suite, 'beforeEach');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['beforeAll', 'beforeEach', 'snapshot']);
  });

  it('executes asynchronous beforeAll hook before beforeEach hooks in suite before rendering snapshot given snapshot in suite', async () => {
    givenAsyncBeforeAll(suite, 'beforeAll');
    givenSyncBeforeEach(suite, 'beforeEach');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['beforeAll', 'beforeEach', 'snapshot']);
  });

  it('executes synchronous beforeAll hook before rendering snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenSyncBeforeAll(suite, 'beforeAll');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['beforeAll', 'nested snapshot']);
  });

  it('executes asynchronous beforeAll hook before rendering snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenAsyncBeforeAll(suite, 'beforeAll');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['beforeAll', 'nested snapshot']);
  });

  it('executes nested synchronous beforeAll hook before rendering snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenSyncBeforeAll(nested, 'nested beforeAll');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['nested beforeAll', 'nested snapshot']);
  });

  it('executes nested asynchronous beforeAll hook before rendering snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenAsyncBeforeAll(nested, 'nested beforeAll');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['nested beforeAll', 'nested snapshot']);
  });

  it('executes synchronous beforeAll hook and nested synchronous beforeAll hook before rendering snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenSyncBeforeAll(suite, 'beforeAll');
    givenSyncBeforeAll(nested, 'nested beforeAll');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['beforeAll', 'nested beforeAll', 'nested snapshot']);
  });

  it('executes synchronous beforeAll hook and nested asynchronous beforeAll hook before rendering snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenSyncBeforeAll(suite, 'beforeAll');
    givenAsyncBeforeAll(nested, 'nested beforeAll');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['beforeAll', 'nested beforeAll', 'nested snapshot']);
  });

  it('executes asynchronous beforeAll hook and nested synchronous beforeAll hook before rendering snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenAsyncBeforeAll(suite, 'beforeAll');
    givenSyncBeforeAll(nested, 'nested beforeAll');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['beforeAll', 'nested beforeAll', 'nested snapshot']);
  });

  it('executes asynchronous beforeAll hook and nested asynchronous beforeAll hook before rendering snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenAsyncBeforeAll(suite, 'beforeAll');
    givenAsyncBeforeAll(nested, 'nested beforeAll');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['beforeAll', 'nested beforeAll', 'nested snapshot']);
  });
});

describe('beforeEach hooks', () => {
  it('executes synchronous beforeEach hooks in the order specified in the suite before rendering snapshot given snapshot in suite', async () => {
    givenSyncBeforeEach(suite, 'beforeEach 1');
    givenSyncBeforeEach(suite, 'beforeEach 2');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['beforeEach 1', 'beforeEach 2', 'snapshot']);
  });

  it('executes asynchronous beforeEach hooks in the order specified in the suite before rendering snapshot given snapshot in suite', async () => {
    givenAsyncBeforeEach(suite, 'beforeEach 1', 2);
    givenAsyncBeforeEach(suite, 'beforeEach 2', 1);
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['beforeEach 1', 'beforeEach 2', 'snapshot']);
  });

  it('executes synchronous beforeEach hook before rendering snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenSyncBeforeEach(suite, 'beforeEach');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['beforeEach', 'nested snapshot']);
  });

  it('executes asynchronous beforeEach hook before rendering snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenAsyncBeforeEach(suite, 'beforeEach');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['beforeEach', 'nested snapshot']);
  });

  it('executes nested synchronous beforeEach hook before rendering snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenSyncBeforeEach(nested, 'nested beforeEach');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['nested beforeEach', 'nested snapshot']);
  });

  it('executes nested asynchronous beforeEach hook before rendering snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenAsyncBeforeEach(nested, 'nested beforeEach');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['nested beforeEach', 'nested snapshot']);
  });

  it('executes synchronous beforeEach hook and nested synchronous beforeEach hook before rendering snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenSyncBeforeEach(suite, 'beforeEach');
    givenSyncBeforeEach(nested, 'nested beforeEach');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['beforeEach', 'nested beforeEach', 'nested snapshot']);
  });

  it('executes synchronous beforeEach hook and nested asynchronous beforeEach hook before rendering snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenSyncBeforeEach(suite, 'beforeEach');
    givenAsyncBeforeEach(nested, 'nested beforeEach');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['beforeEach', 'nested beforeEach', 'nested snapshot']);
  });

  it('executes asynchronous beforeEach hook and nested synchronous beforeEach hook before rendering snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenAsyncBeforeEach(suite, 'beforeEach');
    givenSyncBeforeEach(nested, 'nested beforeEach');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['beforeEach', 'nested beforeEach', 'nested snapshot']);
  });

  it('executes asynchronous beforeEach hook and nested asynchronous beforeEach hook before rendering snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenAsyncBeforeEach(suite, 'beforeEach');
    givenAsyncBeforeEach(nested, 'nested beforeEach');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['beforeEach', 'nested beforeEach', 'nested snapshot']);
  });
});

describe('afterEach hooks', () => {
  it('executes synchronous afterEach hooks in the order specified in the suite after rendering sync snapshot given snapshot in suite', async () => {
    givenSyncAfterEach(suite, 'afterEach 1');
    givenSyncAfterEach(suite, 'afterEach 2');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterEach 1', 'afterEach 2']);
  });

  it('executes synchronous afterEach hooks in the order specified in the suite after rendering async snapshot given snapshot in suite', async () => {
    givenSyncAfterEach(suite, 'afterEach 1');
    givenSyncAfterEach(suite, 'afterEach 2');
    givenAsyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterEach 1', 'afterEach 2']);
  });

  it('executes asynchronous afterEach hooks in the order specified in the suite after rendering sync snapshot given snapshot in suite', async () => {
    givenAsyncAfterEach(suite, 'afterEach 1', 2);
    givenAsyncAfterEach(suite, 'afterEach 2', 1);
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterEach 1', 'afterEach 2']);
  });

  it('executes asynchronous afterEach hooks in the order specified in the suite after rendering async snapshot given snapshot in suite', async () => {
    givenAsyncAfterEach(suite, 'afterEach 1', 2);
    givenAsyncAfterEach(suite, 'afterEach 2', 1);
    givenAsyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterEach 1', 'afterEach 2']);
  });

  it('executes synchronous parent afterEach hook after rendering sync snapshot given snapshot in suite', async () => {
    givenSyncAfterEach(parent, 'parent afterEach');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'parent afterEach']);
  });

  it('executes synchronous parent afterEach hook after rendering async snapshot given snapshot in suite', async () => {
    givenSyncAfterEach(parent, 'parent afterEach');
    givenAsyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'parent afterEach']);
  });

  it('executes asynchronous parent afterEach hook after rendering sync snapshot given snapshot in suite', async () => {
    givenAsyncAfterEach(parent, 'parent afterEach');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'parent afterEach']);
  });

  it('executes asynchronous parent afterEach hook after rendering async snapshot given snapshot in suite', async () => {
    givenAsyncAfterEach(parent, 'parent afterEach');
    givenAsyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'parent afterEach']);
  });

  it('executes synchronous parent afterEach hook after sync suite afterEach hook after rendering sync snapshot given snapshot in suite', async () => {
    givenSyncAfterEach(parent, 'parent afterEach');
    givenSyncAfterEach(suite, 'afterEach');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterEach', 'parent afterEach']);
  });

  it('executes synchronous parent afterEach hook after sync suite afterEach hook after rendering async snapshot given snapshot in suite', async () => {
    givenSyncAfterEach(parent, 'parent afterEach');
    givenSyncAfterEach(suite, 'afterEach');
    givenAsyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterEach', 'parent afterEach']);
  });

  it('executes synchronous parent afterEach hook after async suite afterEach hook after rendering sync snapshot given snapshot in suite', async () => {
    givenSyncAfterEach(parent, 'parent afterEach');
    givenAsyncAfterEach(suite, 'afterEach');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterEach', 'parent afterEach']);
  });

  it('executes synchronous parent afterEach hook after async suite afterEach hook after rendering async snapshot given snapshot in suite', async () => {
    givenSyncAfterEach(parent, 'parent afterEach');
    givenAsyncAfterEach(suite, 'afterEach');
    givenAsyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterEach', 'parent afterEach']);
  });

  it('executes asynchronous parent afterEach hook after sync suite afterEach hook after rendering sync snapshot given snapshot in suite', async () => {
    givenAsyncAfterEach(parent, 'parent afterEach');
    givenSyncAfterEach(suite, 'afterEach');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterEach', 'parent afterEach']);
  });

  it('executes asynchronous parent afterEach hook after sync suite afterEach hook after rendering async snapshot given snapshot in suite', async () => {
    givenAsyncAfterEach(parent, 'parent afterEach');
    givenSyncAfterEach(suite, 'afterEach');
    givenAsyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterEach', 'parent afterEach']);
  });

  it('executes asynchronous parent afterEach hook after async suite afterEach hook after rendering sync snapshot given snapshot in suite', async () => {
    givenAsyncAfterEach(parent, 'parent afterEach');
    givenAsyncAfterEach(suite, 'afterEach');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterEach', 'parent afterEach']);
  });

  it('executes asynchronous parent afterEach hook after async suite afterEach hook after rendering async snapshot given snapshot in suite', async () => {
    givenAsyncAfterEach(parent, 'parent afterEach');
    givenAsyncAfterEach(suite, 'afterEach');
    givenAsyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterEach', 'parent afterEach']);
  });
});

describe('afterAll hooks', () => {
  it('executes synchronous afterAll hooks in the order specified in the suite after rendering sync snapshot given snapshot in suite', async () => {
    givenSyncAfterAll(suite, 'afterAll 1');
    givenSyncAfterAll(suite, 'afterAll 2');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterAll 1', 'afterAll 2']);
  });

  it('executes synchronous afterAll hooks in the order specified in the suite after rendering async snapshot given snapshot in suite', async () => {
    givenSyncAfterAll(suite, 'afterAll 1');
    givenSyncAfterAll(suite, 'afterAll 2');
    givenAsyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterAll 1', 'afterAll 2']);
  });

  it('executes asynchronous afterAll hooks in the order specified in the suite after rendering sync snapshot given snapshot in suite', async () => {
    givenAsyncAfterAll(suite, 'afterAll 1', 2);
    givenAsyncAfterAll(suite, 'afterAll 2', 1);
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterAll 1', 'afterAll 2']);
  });

  it('executes asynchronous afterAll hooks in the order specified in the suite after rendering async snapshot given snapshot in suite', async () => {
    givenAsyncAfterAll(suite, 'afterAll 1', 2);
    givenAsyncAfterAll(suite, 'afterAll 2', 1);
    givenAsyncSnapshot(suite, 'snapshot');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterAll 1', 'afterAll 2']);
  });

  it('executes synchronous afterAll hook after sync afterEach hooks in suite after rendering sync snapshot given snapshot in suite', async () => {
    givenSyncSnapshot(suite, 'snapshot');
    givenSyncAfterEach(suite, 'afterEach');
    givenSyncAfterAll(suite, 'afterAll');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterEach', 'afterAll']);
  });

  it('executes synchronous afterAll hook after sync afterEach hooks in suite after rendering async snapshot given snapshot in suite', async () => {
    givenAsyncSnapshot(suite, 'snapshot');
    givenSyncAfterEach(suite, 'afterEach');
    givenSyncAfterAll(suite, 'afterAll');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterEach', 'afterAll']);
  });

  it('executes synchronous afterAll hook after async afterEach hooks in suite after rendering sync snapshot given snapshot in suite', async () => {
    givenSyncSnapshot(suite, 'snapshot');
    givenAsyncAfterEach(suite, 'afterEach');
    givenSyncAfterAll(suite, 'afterAll');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterEach', 'afterAll']);
  });

  it('executes synchronous afterAll hook after async afterEach hooks in suite after rendering async snapshot given snapshot in suite', async () => {
    givenAsyncSnapshot(suite, 'snapshot');
    givenAsyncAfterEach(suite, 'afterEach');
    givenSyncAfterAll(suite, 'afterAll');

    await suite.getSnapshotMarkup('snapshot');

    expect(executed).toEqual(['snapshot', 'afterEach', 'afterAll']);
  });

  it('executes synchronous afterAll hook after nested snapshot sync afterAll hook after rendering sync snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenSyncAfterAll(suite, 'afterAll');
    givenSyncAfterAll(nested, 'nested afterAll');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['nested snapshot', 'nested afterAll', 'afterAll']);
  });

  it('executes synchronous afterAll hook after nested snapshot sync afterAll hook after rendering async snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenSyncAfterAll(suite, 'afterAll');
    givenSyncAfterAll(nested, 'nested afterAll');
    givenAsyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['nested snapshot', 'nested afterAll', 'afterAll']);
  });

  it('executes synchronous afterAll hook after nested snapshot async afterAll hook after rendering sync snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenSyncAfterAll(suite, 'afterAll');
    givenAsyncAfterAll(nested, 'nested afterAll');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['nested snapshot', 'nested afterAll', 'afterAll']);
  });

  it('executes synchronous afterAll hook after nested snapshot async afterAll hook after rendering async snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenSyncAfterAll(suite, 'afterAll');
    givenAsyncAfterAll(nested, 'nested afterAll');
    givenAsyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['nested snapshot', 'nested afterAll', 'afterAll']);
  });

  it('executes asynchronous afterAll hook after nested snapshot sync afterAll hook after rendering sync snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenAsyncAfterAll(suite, 'afterAll');
    givenSyncAfterAll(nested, 'nested afterAll');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['nested snapshot', 'nested afterAll', 'afterAll']);
  });

  it('executes asynchronous afterAll hook after nested snapshot sync afterAll hook after rendering async snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenAsyncAfterAll(suite, 'afterAll');
    givenSyncAfterAll(nested, 'nested afterAll');
    givenAsyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['nested snapshot', 'nested afterAll', 'afterAll']);
  });

  it('executes asynchronous afterAll hook after nested snapshot async afterAll hook after rendering sync snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenAsyncAfterAll(suite, 'afterAll');
    givenAsyncAfterAll(nested, 'nested afterAll');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['nested snapshot', 'nested afterAll', 'afterAll']);
  });

  it('executes asynchronous afterAll hook after nested snapshot async afterAll hook after rendering async snapshot given snapshot in nested suite', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenAsyncAfterAll(suite, 'afterAll');
    givenAsyncAfterAll(nested, 'nested afterAll');
    givenAsyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshotMarkup('nested snapshot');

    expect(executed).toEqual(['nested snapshot', 'nested afterAll', 'afterAll']);
  });
});

describe('getSnapshotMarkup', () => {
  it('returns snapshot markup given sync snapshot in suite', async () => {
    const markup = <div>markup</div>;
    suite.addSnapshot({
      fullTitle: () => 'snapshot',
      getMarkup: () => markup,
    });

    const snapshotMarkup = await suite.getSnapshotMarkup('snapshot');

    expect(snapshotMarkup).toBe(markup);
  });

  it('returns snapshot markup given async snapshot in suite', async () => {
    const markup = <div>markup</div>;
    suite.addSnapshot({
      fullTitle: () => 'snapshot',
      getMarkup: async () => {
        await executeAsync('something', 1);
        return markup;
      },
    });

    const snapshotMarkup = await suite.getSnapshotMarkup('snapshot');

    expect(snapshotMarkup).toBe(markup);
  });

  it('returns snapshot markup given sync snapshot in nested suite', async () => {
    const nestedSuite = new Suite('nested');
    suite.addSuite(nestedSuite);

    const markup = <div>markup</div>;
    nestedSuite.addSnapshot({
      fullTitle: () => 'nested snapshot',
      getMarkup: () => markup,
    });

    const snapshotMarkup = await suite.getSnapshotMarkup('nested snapshot');

    expect(snapshotMarkup).toBe(markup);
  });

  it('returns snapshot markup given async snapshot in nested suite', async () => {
    const nestedSuite = new Suite('nested');
    suite.addSuite(nestedSuite);

    const markup = <div>markup</div>;
    nestedSuite.addSnapshot({
      fullTitle: () => 'nested snapshot',
      getMarkup: async () => {
        await executeAsync('something', 1);
        return markup;
      },
    });

    const snapshotMarkup = await suite.getSnapshotMarkup('nested snapshot');

    expect(snapshotMarkup).toBe(markup);
  });

  it('rejects when no snapshot with given title is in suite or nested suites', async () => {
    const nestedSuite = new Suite('nested');
    suite.addSuite(nestedSuite);

    await expect(suite.getSnapshotMarkup('non-existent snapshot')).rejects.toBeDefined();
  });
});
