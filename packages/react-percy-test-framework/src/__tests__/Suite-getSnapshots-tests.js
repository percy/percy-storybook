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
    title: name,
    getSnapshot: () => {
      execute(name);
      return {};
    },
  });
const givenAsyncSnapshot = (targetSuite, name, delay = 1) =>
  targetSuite.addSnapshot({
    title: name,
    getSnapshot: async () => {
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
  it('executes synchronous beforeAll hooks in the order specified in the suite', async () => {
    givenSyncBeforeAll(suite, 'beforeAll 1');
    givenSyncBeforeAll(suite, 'beforeAll 2');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeAll 1', 'beforeAll 2', 'snapshot']);
  });

  it('executes asynchronous beforeAll hooks in the order specified in the suite', async () => {
    givenAsyncBeforeAll(suite, 'beforeAll 1', 2);
    givenAsyncBeforeAll(suite, 'beforeAll 2', 1);
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeAll 1', 'beforeAll 2', 'snapshot']);
  });

  it('executes synchronous beforeAll hook before other hooks in suite', async () => {
    givenSyncBeforeAll(suite, 'beforeAll');
    givenSyncBeforeEach(suite, 'beforeEach');
    givenSyncSnapshot(suite, 'snapshot');
    givenSyncAfterEach(suite, 'afterEach');
    givenSyncAfterAll(suite, 'afterAll');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeAll', 'beforeEach', 'snapshot', 'afterEach', 'afterAll']);
  });

  it('executes asynchronous beforeAll hook before other hooks in suite', async () => {
    givenAsyncBeforeAll(suite, 'beforeAll');
    givenSyncBeforeEach(suite, 'beforeEach');
    givenSyncSnapshot(suite, 'snapshot');
    givenSyncAfterEach(suite, 'afterEach');
    givenSyncAfterAll(suite, 'afterAll');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeAll', 'beforeEach', 'snapshot', 'afterEach', 'afterAll']);
  });

  it('executes synchronous beforeAll hook before nested snapshot suites', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenSyncBeforeAll(suite, 'beforeAll');
    givenSyncBeforeAll(nested, 'nested beforeAll');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeAll', 'nested beforeAll', 'nested snapshot']);
  });

  it('executes asynchronous beforeAll hook before nested snapshot suites', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenAsyncBeforeAll(suite, 'beforeAll');
    givenSyncBeforeAll(nested, 'nested beforeAll');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeAll', 'nested beforeAll', 'nested snapshot']);
  });

  it('executes synchronous beforeAll hook only once given multiple snapshots', async () => {
    givenSyncBeforeAll(suite, 'beforeAll');
    givenSyncSnapshot(suite, 'snapshot 1');
    givenSyncSnapshot(suite, 'snapshot 2');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeAll', 'snapshot 1', 'snapshot 2']);
  });

  it('executes asynchronous beforeAll hook only once given multiple snapshots', async () => {
    givenAsyncBeforeAll(suite, 'beforeAll');
    givenSyncSnapshot(suite, 'snapshot 1');
    givenSyncSnapshot(suite, 'snapshot 2');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeAll', 'snapshot 1', 'snapshot 2']);
  });

  it('executes synchronous beforeAll hook only once given multiple nested suites', async () => {
    const nested1 = new Suite('nested 1');
    const nested2 = new Suite('nested 2');
    suite.addSuite(nested1);
    suite.addSuite(nested2);

    givenSyncBeforeAll(suite, 'beforeAll');
    givenSyncSnapshot(nested1, 'nested snapshot 1');
    givenSyncSnapshot(nested2, 'nested snapshot 2');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeAll', 'nested snapshot 1', 'nested snapshot 2']);
  });

  it('executes asynchronous beforeAll hook only once given multiple nested suites', async () => {
    const nested1 = new Suite('nested 1');
    const nested2 = new Suite('nested 2');
    suite.addSuite(nested1);
    suite.addSuite(nested2);

    givenAsyncBeforeAll(suite, 'beforeAll');
    givenSyncSnapshot(nested1, 'nested snapshot 1');
    givenSyncSnapshot(nested2, 'nested snapshot 2');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeAll', 'nested snapshot 1', 'nested snapshot 2']);
  });
});

describe('beforeEach hooks', () => {
  it('executes synchronous beforeEach hooks in the order specified in the suite', async () => {
    givenSyncBeforeEach(suite, 'beforeEach 1');
    givenSyncBeforeEach(suite, 'beforeEach 2');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeEach 1', 'beforeEach 2', 'snapshot']);
  });

  it('executes asynchronous beforeEach hooks in the order specified in the suite', async () => {
    givenAsyncBeforeEach(suite, 'beforeEach 1', 2);
    givenAsyncBeforeEach(suite, 'beforeEach 2', 1);
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeEach 1', 'beforeEach 2', 'snapshot']);
  });

  it('executes synchronous beforeEach hook before snapshot and after hooks', async () => {
    givenSyncBeforeAll(suite, 'beforeAll');
    givenSyncBeforeEach(suite, 'beforeEach');
    givenSyncSnapshot(suite, 'snapshot');
    givenSyncAfterEach(suite, 'afterEach');
    givenSyncAfterAll(suite, 'afterAll');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeAll', 'beforeEach', 'snapshot', 'afterEach', 'afterAll']);
  });

  it('executes asynchronous beforeEach hook before snapshot and after hooks', async () => {
    givenSyncBeforeAll(suite, 'beforeAll');
    givenAsyncBeforeEach(suite, 'beforeEach');
    givenSyncSnapshot(suite, 'snapshot');
    givenSyncAfterEach(suite, 'afterEach');
    givenSyncAfterAll(suite, 'afterAll');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeAll', 'beforeEach', 'snapshot', 'afterEach', 'afterAll']);
  });

  it('executes synchronous beforeEach hook before each snapshot', async () => {
    givenSyncBeforeEach(suite, 'beforeEach');
    givenSyncSnapshot(suite, 'snapshot 1');
    givenSyncSnapshot(suite, 'snapshot 2');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeEach', 'snapshot 1', 'beforeEach', 'snapshot 2']);
  });

  it('executes asynchronous beforeEach hook before each snapshot', async () => {
    givenAsyncBeforeEach(suite, 'beforeEach');
    givenSyncSnapshot(suite, 'snapshot 1');
    givenSyncSnapshot(suite, 'snapshot 2');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeEach', 'snapshot 1', 'beforeEach', 'snapshot 2']);
  });

  it('executes synchronous parent beforeEach hook before each snapshot', async () => {
    givenSyncBeforeEach(parent, 'parent beforeEach');
    givenSyncSnapshot(suite, 'snapshot 1');
    givenSyncSnapshot(suite, 'snapshot 2');

    await suite.getSnapshots();

    expect(executed).toEqual([
      'parent beforeEach',
      'snapshot 1',
      'parent beforeEach',
      'snapshot 2',
    ]);
  });

  it('executes asynchronous parent beforeEach hook before each snapshot', async () => {
    givenAsyncBeforeEach(parent, 'parent beforeEach');
    givenSyncSnapshot(suite, 'snapshot 1');
    givenSyncSnapshot(suite, 'snapshot 2');

    await suite.getSnapshots();

    expect(executed).toEqual([
      'parent beforeEach',
      'snapshot 1',
      'parent beforeEach',
      'snapshot 2',
    ]);
  });

  it('executes synchronous parent beforeEach hook before suite beforeEach hook', async () => {
    givenSyncBeforeEach(parent, 'parent beforeEach');
    givenSyncBeforeEach(suite, 'beforeEach');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshots();

    expect(executed).toEqual(['parent beforeEach', 'beforeEach', 'snapshot']);
  });

  it('executes asynchronous parent beforeEach hook before suite beforeEach hook', async () => {
    givenAsyncBeforeEach(parent, 'parent beforeEach');
    givenSyncBeforeEach(suite, 'beforeEach');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshots();

    expect(executed).toEqual(['parent beforeEach', 'beforeEach', 'snapshot']);
  });
});

describe('afterEach hooks', () => {
  it('executes synchronous afterEach hooks in the order specified in the suite', async () => {
    givenSyncAfterEach(suite, 'afterEach 1');
    givenSyncAfterEach(suite, 'afterEach 2');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshots();

    expect(executed).toEqual(['snapshot', 'afterEach 1', 'afterEach 2']);
  });

  it('executes asynchronous afterEach hooks in the order specified in the suite', async () => {
    givenAsyncAfterEach(suite, 'afterEach 1', 2);
    givenAsyncAfterEach(suite, 'afterEach 2', 1);
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshots();

    expect(executed).toEqual(['snapshot', 'afterEach 1', 'afterEach 2']);
  });

  it('executes synchronous afterEach hook after snapshot and before afterAll hooks', async () => {
    givenSyncBeforeAll(suite, 'beforeAll');
    givenSyncBeforeEach(suite, 'beforeEach');
    givenSyncSnapshot(suite, 'snapshot');
    givenSyncAfterEach(suite, 'afterEach');
    givenSyncAfterAll(suite, 'afterAll');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeAll', 'beforeEach', 'snapshot', 'afterEach', 'afterAll']);
  });

  it('executes asynchronous afterEach hook after snapshot and before afterAll hooks', async () => {
    givenSyncBeforeAll(suite, 'beforeAll');
    givenSyncBeforeEach(suite, 'beforeEach');
    givenSyncSnapshot(suite, 'snapshot');
    givenAsyncAfterEach(suite, 'afterEach');
    givenSyncAfterAll(suite, 'afterAll');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeAll', 'beforeEach', 'snapshot', 'afterEach', 'afterAll']);
  });

  it('executes synchronous afterEach hook after each snapshot', async () => {
    givenSyncAfterEach(suite, 'afterEach');
    givenSyncSnapshot(suite, 'snapshot 1');
    givenSyncSnapshot(suite, 'snapshot 2');

    await suite.getSnapshots();

    expect(executed).toEqual(['snapshot 1', 'afterEach', 'snapshot 2', 'afterEach']);
  });

  it('executes asynchronous afterEach hook after each snapshot', async () => {
    givenAsyncAfterEach(suite, 'afterEach');
    givenSyncSnapshot(suite, 'snapshot 1');
    givenSyncSnapshot(suite, 'snapshot 2');

    await suite.getSnapshots();

    expect(executed).toEqual(['snapshot 1', 'afterEach', 'snapshot 2', 'afterEach']);
  });

  it('executes synchronous parent afterEach hook after each snapshot', async () => {
    givenSyncAfterEach(parent, 'parent afterEach');
    givenSyncSnapshot(suite, 'snapshot 1');
    givenSyncSnapshot(suite, 'snapshot 2');

    await suite.getSnapshots();

    expect(executed).toEqual(['snapshot 1', 'parent afterEach', 'snapshot 2', 'parent afterEach']);
  });

  it('executes asynchronous parent afterEach hook after each snapshot', async () => {
    givenAsyncAfterEach(parent, 'parent afterEach');
    givenSyncSnapshot(suite, 'snapshot 1');
    givenSyncSnapshot(suite, 'snapshot 2');

    await suite.getSnapshots();

    expect(executed).toEqual(['snapshot 1', 'parent afterEach', 'snapshot 2', 'parent afterEach']);
  });

  it('executes synchronous parent afterEach hook after suite afterEach hook', async () => {
    givenSyncAfterEach(parent, 'parent afterEach');
    givenSyncAfterEach(suite, 'afterEach');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshots();

    expect(executed).toEqual(['snapshot', 'afterEach', 'parent afterEach']);
  });

  it('executes asynchronous parent afterEach hook after suite afterEach hook', async () => {
    givenAsyncAfterEach(parent, 'parent afterEach');
    givenSyncAfterEach(suite, 'afterEach');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshots();

    expect(executed).toEqual(['snapshot', 'afterEach', 'parent afterEach']);
  });
});

describe('afterAll hooks', () => {
  it('executes synchronous afterAll hooks in the order specified in the suite', async () => {
    givenSyncAfterAll(suite, 'afterAll 1');
    givenSyncAfterAll(suite, 'afterAll 2');
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshots();

    expect(executed).toEqual(['snapshot', 'afterAll 1', 'afterAll 2']);
  });

  it('executes asynchronous afterAll hooks in the order specified in the suite', async () => {
    givenAsyncAfterAll(suite, 'afterAll 1', 2);
    givenAsyncAfterAll(suite, 'afterAll 2', 1);
    givenSyncSnapshot(suite, 'snapshot');

    await suite.getSnapshots();

    expect(executed).toEqual(['snapshot', 'afterAll 1', 'afterAll 2']);
  });

  it('executes synchronous afterAll hook after other hooks in suite', async () => {
    givenSyncBeforeAll(suite, 'beforeAll');
    givenSyncBeforeEach(suite, 'beforeEach');
    givenSyncSnapshot(suite, 'snapshot');
    givenSyncAfterEach(suite, 'afterEach');
    givenSyncAfterAll(suite, 'afterAll');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeAll', 'beforeEach', 'snapshot', 'afterEach', 'afterAll']);
  });

  it('executes asynchronous afterAll hook after other hooks in suite', async () => {
    givenSyncBeforeAll(suite, 'beforeAll');
    givenSyncBeforeEach(suite, 'beforeEach');
    givenSyncSnapshot(suite, 'snapshot');
    givenSyncAfterEach(suite, 'afterEach');
    givenAsyncAfterAll(suite, 'afterAll');

    await suite.getSnapshots();

    expect(executed).toEqual(['beforeAll', 'beforeEach', 'snapshot', 'afterEach', 'afterAll']);
  });

  it('executes synchronous afterAll hook after nested snapshot suites', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenSyncAfterAll(suite, 'afterAll');
    givenSyncAfterAll(nested, 'nested afterAll');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshots();

    expect(executed).toEqual(['nested snapshot', 'nested afterAll', 'afterAll']);
  });

  it('executes asynchronous afterAll hook before nested snapshot suites', async () => {
    const nested = new Suite('nested');
    suite.addSuite(nested);

    givenAsyncAfterAll(suite, 'afterAll');
    givenSyncAfterAll(nested, 'nested afterAll');
    givenSyncSnapshot(nested, 'nested snapshot');

    await suite.getSnapshots();

    expect(executed).toEqual(['nested snapshot', 'nested afterAll', 'afterAll']);
  });

  it('executes synchronous afterAll hook only once given multiple snapshots', async () => {
    givenSyncAfterAll(suite, 'afterAll');
    givenSyncSnapshot(suite, 'snapshot 1');
    givenSyncSnapshot(suite, 'snapshot 2');

    await suite.getSnapshots();

    expect(executed).toEqual(['snapshot 1', 'snapshot 2', 'afterAll']);
  });

  it('executes asynchronous afterAll hook only once given multiple snapshots', async () => {
    givenAsyncAfterAll(suite, 'afterAll');
    givenSyncSnapshot(suite, 'snapshot 1');
    givenSyncSnapshot(suite, 'snapshot 2');

    await suite.getSnapshots();

    expect(executed).toEqual(['snapshot 1', 'snapshot 2', 'afterAll']);
  });

  it('executes synchronous afterAll hook only once given multiple nested suites', async () => {
    const nested1 = new Suite('nested 1');
    const nested2 = new Suite('nested 2');
    suite.addSuite(nested1);
    suite.addSuite(nested2);

    givenSyncAfterAll(suite, 'afterAll');
    givenSyncSnapshot(nested1, 'nested snapshot 1');
    givenSyncSnapshot(nested2, 'nested snapshot 2');

    await suite.getSnapshots();

    expect(executed).toEqual(['nested snapshot 1', 'nested snapshot 2', 'afterAll']);
  });

  it('executes asynchronous afterAll hook only once given multiple nested suites', async () => {
    const nested1 = new Suite('nested 1');
    const nested2 = new Suite('nested 2');
    suite.addSuite(nested1);
    suite.addSuite(nested2);

    givenAsyncAfterAll(suite, 'afterAll');
    givenSyncSnapshot(nested1, 'nested snapshot 1');
    givenSyncSnapshot(nested2, 'nested snapshot 2');

    await suite.getSnapshots();

    expect(executed).toEqual(['nested snapshot 1', 'nested snapshot 2', 'afterAll']);
  });
});

describe('snapshots', () => {
  it('runs synchronous snapshots in order specified in suite', async () => {
    givenSyncSnapshot(suite, 'snapshot 1');
    givenSyncSnapshot(suite, 'snapshot 2');

    await suite.getSnapshots();

    expect(executed).toEqual(['snapshot 1', 'snapshot 2']);
  });

  it('runs asynchronous snapshots in order specified in suite', async () => {
    givenAsyncSnapshot(suite, 'snapshot 1', 2);
    givenAsyncSnapshot(suite, 'snapshot 2', 1);

    await suite.getSnapshots();

    expect(executed).toEqual(['snapshot 1', 'snapshot 2']);
  });

  it('runs synchronous snapshots before after hooks', async () => {
    givenSyncSnapshot(suite, 'snapshot');
    givenSyncAfterEach(suite, 'afterEach');
    givenSyncAfterAll(suite, 'afterAll');

    await suite.getSnapshots();

    expect(executed).toEqual(['snapshot', 'afterEach', 'afterAll']);
  });

  it('runs asynchronous snapshots before after hooks', async () => {
    givenAsyncSnapshot(suite, 'snapshot');
    givenSyncAfterEach(suite, 'afterEach');
    givenSyncAfterAll(suite, 'afterAll');

    await suite.getSnapshots();

    expect(executed).toEqual(['snapshot', 'afterEach', 'afterAll']);
  });

  it('returns snapshot cases', async () => {
    const snapshotCase1 = {
      title: 'snapshot 1',
      markup: <div>Snapshot 1</div>,
      options: {},
    };
    suite.addSnapshot({
      title: 'snapshot 1',
      getSnapshot: () => snapshotCase1,
    });
    const snapshotCase2 = {
      title: 'snapshot 2',
      markup: <div>Snapshot 2</div>,
      options: {},
    };
    suite.addSnapshot({
      title: 'snapshot 2',
      getSnapshot: () => snapshotCase2,
    });

    const snapshotCases = await suite.getSnapshots();

    expect(snapshotCases).toEqual([snapshotCase1, snapshotCase2]);
  });

  it('filters out snapshots with no implementation', async () => {
    const snapshotCase1 = {
      title: 'snapshot 1',
      markup: <div>Snapshot 1</div>,
      options: {},
    };
    suite.addSnapshot({
      title: 'snapshot 1',
      getSnapshot: () => snapshotCase1,
    });
    suite.addSnapshot({
      title: 'snapshot 2',
      getSnapshot: () => undefined,
    });
    const snapshotCase3 = {
      title: 'snapshot 3',
      markup: <div>Snapshot 3</div>,
      options: {},
    };
    suite.addSnapshot({
      title: 'snapshot 3',
      getSnapshot: () => snapshotCase3,
    });

    const snapshotCases = await suite.getSnapshots();

    expect(snapshotCases).toEqual([snapshotCase1, snapshotCase3]);
  });
});

describe('nested suites', () => {
  it('returns snapshot cases from nested suites', async () => {
    const snapshotCase = {
      title: 'snapshot',
      markup: <div>Snapshot</div>,
      options: {},
    };
    suite.addSnapshot({
      title: 'snapshot 1',
      getSnapshot: () => snapshotCase,
    });
    const nestedSuite = new Suite('nested');
    suite.addSuite(nestedSuite);
    const nestedSnapshotCase1 = {
      title: 'nested snapshot 1',
      markup: <div>Nested Snapshot 1</div>,
      options: {},
    };
    nestedSuite.addSnapshot({
      title: 'nested snapshot 1',
      getSnapshot: () => nestedSnapshotCase1,
    });
    const nestedSnapshotCase2 = {
      title: 'nested snapshot 2',
      markup: <div>Nested Snapshot 2</div>,
      options: {},
    };
    nestedSuite.addSnapshot({
      title: 'nested snapshot 2',
      getSnapshot: () => nestedSnapshotCase2,
    });

    const snapshotCases = await suite.getSnapshots();

    expect(snapshotCases).toEqual([nestedSnapshotCase1, nestedSnapshotCase2, snapshotCase]);
  });
});
