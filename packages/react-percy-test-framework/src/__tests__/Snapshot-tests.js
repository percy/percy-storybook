import React from 'react';
import Snapshot from '../Snapshot';

describe('constructor', () => {
  it('throws when no title or function is specified', () => {
    expect(() => new Snapshot()).toThrow();
  });

  it('throws when no title is specified', () => {
    expect(() => new Snapshot(() => {})).toThrow();
  });
});

describe('getDefinition', () => {
  it('returns undefined given no function was specified', () => {
    const snapshot = new Snapshot('title');

    const definition = snapshot.getDefinition();

    expect(definition).toBeUndefined();
  });

  it('sets name to title given no parent', () => {
    const snapshot = new Snapshot('title', () => {});

    const definition = snapshot.getDefinition();

    expect(definition.name).toEqual('title');
  });

  it('sets name to title given parent with no title', () => {
    const snapshot = new Snapshot('title', () => {});
    snapshot.parent = {
      fullTitle: () => '',
      getOptions: () => [],
    };

    const definition = snapshot.getDefinition();

    expect(definition.name).toEqual('title');
  });

  it('sets name to combined title given parent with title', () => {
    const snapshot = new Snapshot('title', () => {});
    snapshot.parent = {
      fullTitle: () => 'parent title',
      getOptions: () => [],
    };

    const definition = snapshot.getDefinition();

    expect(definition.name).toEqual('parent title: title');
  });

  it('sets options to an empty object given no options specified and no parent', async () => {
    const snapshot = new Snapshot('title', () => {});

    const definition = snapshot.getDefinition();

    expect(definition.options).toEqual({});
  });

  it('sets options to parent options given no options specified', () => {
    const snapshot = new Snapshot('title', () => {});
    snapshot.parent = {
      fullTitle: () => '',
      getOptions: () => ({ widths: [320, 768] }),
    };

    const definition = snapshot.getDefinition();

    expect(definition.options).toEqual({ widths: [320, 768] });
  });

  it('options on snapshot override same options specified on parent', () => {
    const snapshot = new Snapshot('title', { widths: [375, 1024] }, () => {});
    snapshot.parent = {
      fullTitle: () => '',
      getOptions: () => ({ widths: [320, 768] }),
    };

    const definition = snapshot.getDefinition();

    expect(definition.options).toEqual({ widths: [375, 1024] });
  });

  it('options on snapshot are merged with parent options', () => {
    const snapshot = new Snapshot('title', { minimumHeight: 300 }, () => {});
    snapshot.parent = {
      fullTitle: () => '',
      getOptions: () => ({ widths: [320, 768] }),
    };

    const definition = snapshot.getDefinition();

    expect(definition.options).toEqual({ minimumHeight: 300, widths: [320, 768] });
  });
});

describe('getMarkup', () => {
  it('returns the result of synchronous snapshot function', async () => {
    const markup = <div>Snapshot</div>;
    const snapshot = new Snapshot('title', () => markup);

    const snapshotMarkup = await snapshot.getMarkup();

    expect(snapshotMarkup).toEqual(markup);
  });

  it('returns the result of asynchronous snapshot function', async () => {
    const markup = <div>Snapshot</div>;
    const snapshot = new Snapshot(
      'title',
      () =>
        new Promise(resolve => {
          setTimeout(() => resolve(markup), 2);
        }),
    );

    const snapshotMarkup = await snapshot.getMarkup();

    expect(snapshotMarkup).toEqual(markup);
  });

  it('returns the result of the snapshot function when options are also specified', async () => {
    const markup = <div>Snapshot</div>;
    const snapshot = new Snapshot('title', { widths: [320, 768] }, () => markup);

    const snapshotMarkup = await snapshot.getMarkup();

    expect(snapshotMarkup).toEqual(markup);
  });
});
