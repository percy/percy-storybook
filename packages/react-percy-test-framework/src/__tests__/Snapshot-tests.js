import React from 'react';
import Snapshot from '../Snapshot';

describe('constructor', () => {
  it('throws when no title or function is specified', () => {
    expect(() => new Snapshot()).toThrow();
  });

  it('throws when no title is specified', () => {
    expect(() => new Snapshot(() => {})).toThrow();
  });

  it('throws when title and options, but no function is specified', () => {
    expect(() => new Snapshot('snapshot', { widths: [320, 1024] })).toThrow();
  });
});

describe('getSnapshot', () => {
  it('sets name to title given no parent', async () => {
    const snapshot = new Snapshot('title', () => {});

    const snapshotResult = await snapshot.getSnapshot();

    expect(snapshotResult.name).toEqual('title');
  });

  it('sets name to title given parent with no title', async () => {
    const snapshot = new Snapshot('title', () => {});
    snapshot.parent = {
      fullTitle: () => '',
      getOptions: () => [],
    };

    const snapshotResult = await snapshot.getSnapshot();

    expect(snapshotResult.name).toEqual('title');
  });

  it('sets name to combined title given parent with title', async () => {
    const snapshot = new Snapshot('title', () => {});
    snapshot.parent = {
      fullTitle: () => 'parent title',
      getOptions: () => [],
    };

    const snapshotResult = await snapshot.getSnapshot();

    expect(snapshotResult.name).toEqual('parent title - title');
  });

  it('sets markup to the result of synchronous snapshot function', async () => {
    const markup = <div>Snapshot</div>;
    const snapshot = new Snapshot('title', () => markup);

    const snapshotResult = await snapshot.getSnapshot();

    expect(snapshotResult.markup).toEqual(markup);
  });

  it('sets markup to the result of asynchronous snapshot function', async () => {
    const markup = <div>Snapshot</div>;
    const snapshot = new Snapshot(
      'title',
      () =>
        new Promise(resolve => {
          setTimeout(() => resolve(markup), 2);
        }),
    );

    const snapshotResult = await snapshot.getSnapshot();

    expect(snapshotResult.markup).toEqual(markup);
  });

  it('sets markup to the result of the snapshot function when options are also specified', async () => {
    const markup = <div>Snapshot</div>;
    const snapshot = new Snapshot('title', { widths: [320, 768] }, () => markup);

    const snapshotResult = await snapshot.getSnapshot();

    expect(snapshotResult.markup).toEqual(markup);
  });

  it('sets options to an empty empty given no options specified and no parent', async () => {
    const snapshot = new Snapshot('title', () => {});

    const snapshotResult = await snapshot.getSnapshot();

    expect(snapshotResult.options).toEqual({});
  });

  it('sets options to parent options given no options specified', async () => {
    const snapshot = new Snapshot('title', () => {});
    snapshot.parent = {
      fullTitle: () => '',
      getOptions: () => ({ widths: [320, 768] }),
    };

    const snapshotResult = await snapshot.getSnapshot();

    expect(snapshotResult.options).toEqual({ widths: [320, 768] });
  });

  it('options on snapshot override same options specified on parent', async () => {
    const snapshot = new Snapshot('title', { widths: [375, 1024] }, () => {});
    snapshot.parent = {
      fullTitle: () => '',
      getOptions: () => ({ widths: [320, 768] }),
    };

    const snapshotResult = await snapshot.getSnapshot();

    expect(snapshotResult.options).toEqual({ widths: [375, 1024] });
  });

  it('options on snapshot are merged with parent options', async () => {
    const snapshot = new Snapshot('title', { minimumHeight: 300 }, () => {});
    snapshot.parent = {
      fullTitle: () => '',
      getOptions: () => ({ widths: [320, 768] }),
    };

    const snapshotResult = await snapshot.getSnapshot();

    expect(snapshotResult.options).toEqual({ minimumHeight: 300, widths: [320, 768] });
  });
});
