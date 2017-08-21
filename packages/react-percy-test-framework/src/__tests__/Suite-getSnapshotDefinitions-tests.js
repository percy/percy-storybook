import Suite from '../Suite';

let suite;
let nestedSuite1;
let nestedSuite2;

const givenSnapshot = (targetSuite, title) => {
  const definition = {
    title,
    options: {},
  };
  targetSuite.addSnapshot({
    fullTitle: () => title,
    getDefinition: () => definition,
  });
  return definition;
};

const givenUnimplementedSnapshot = (targetSuite, title) => {
  targetSuite.addSnapshot({
    fullTitle: () => title,
    getDefinition: () => undefined,
  });
};

beforeEach(() => {
  suite = new Suite('title');
  suite.parent = new Suite('parent');

  nestedSuite1 = new Suite('nested 1');
  suite.addSuite(nestedSuite1);

  nestedSuite2 = new Suite('nested 2');
  suite.addSuite(nestedSuite2);
});

describe('getSnapshotDefinitions', () => {
  it('returns definitions for all snapshots on suite', () => {
    const snapshotDef1 = givenSnapshot(suite, 'snapshot 1');
    const snapshotDef2 = givenSnapshot(suite, 'snapshot 2');

    const definitions = suite.getSnapshotDefinitions();

    expect(definitions).toContain(snapshotDef1);
    expect(definitions).toContain(snapshotDef2);
  });

  it('returns definitions for all snapshots on nested suites and all snapshots on suite', () => {
    const snapshotDef1 = givenSnapshot(suite, 'snapshot 1');
    const snapshotDef2 = givenSnapshot(suite, 'snapshot 2');
    const nestedSnapshotDef1 = givenSnapshot(nestedSuite1, 'nested snapshot 1');
    const nestedSnapshotDef2 = givenSnapshot(nestedSuite1, 'nested snapshot 2');
    const nestedSnapshotDef3 = givenSnapshot(nestedSuite1, 'nested snapshot 3');

    const definitions = suite.getSnapshotDefinitions();

    expect(definitions).toContain(snapshotDef1);
    expect(definitions).toContain(snapshotDef2);
    expect(definitions).toContain(nestedSnapshotDef1);
    expect(definitions).toContain(nestedSnapshotDef2);
    expect(definitions).toContain(nestedSnapshotDef3);
  });

  it('returns snapshot definitions in the order in which snapshots were added', () => {
    const snapshotDef1 = givenSnapshot(suite, 'snapshot 1');
    const snapshotDef2 = givenSnapshot(suite, 'snapshot 2');

    const definitions = suite.getSnapshotDefinitions();

    expect(definitions).toEqual([snapshotDef1, snapshotDef2]);
  });

  it('returns ordered snapshot definitions from the nested suites followed by the suite', () => {
    const snapshotDef1 = givenSnapshot(suite, 'snapshot 1');
    const snapshotDef2 = givenSnapshot(suite, 'snapshot 2');
    const nestedSnapshotDef1 = givenSnapshot(nestedSuite1, 'nested snapshot 1');
    const nestedSnapshotDef2 = givenSnapshot(nestedSuite1, 'nested snapshot 2');
    const nestedSnapshotDef3 = givenSnapshot(nestedSuite1, 'nested snapshot 3');

    const definitions = suite.getSnapshotDefinitions();

    expect(definitions).toEqual([
      nestedSnapshotDef1,
      nestedSnapshotDef2,
      nestedSnapshotDef3,
      snapshotDef1,
      snapshotDef2,
    ]);
  });

  it('filters out snapshots with no implementation', () => {
    const snapshotDef1 = givenSnapshot(suite, 'snapshot 1');
    givenUnimplementedSnapshot(suite, 'snapshot 2');
    const snapshotDef3 = givenSnapshot(suite, 'snapshot 3');

    const definitions = suite.getSnapshotDefinitions();

    expect(definitions).toHaveLength(2);
    expect(definitions).toContain(snapshotDef1);
    expect(definitions).toContain(snapshotDef3);
  });
});
