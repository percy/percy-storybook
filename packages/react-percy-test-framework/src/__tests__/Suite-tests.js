import Suite from '../Suite';

describe('constructor', () => {
  it('throws when no title is specified', () => {
    expect(() => new Suite()).toThrow();
  });
});

describe('addSuite', () => {
  it('sets parent on suite being added', () => {
    const suite = new Suite('title');
    const nestedSuite = new Suite('nested');

    suite.addSuite(nestedSuite);

    expect(nestedSuite.parent).toEqual(suite);
  });
});

describe('addSnapshot', () => {
  it('sets parent on snapshot being added', () => {
    const suite = new Suite('title');
    suite.parent = new Suite('parent');
    const snapshot = { title: 'snapshot' };

    suite.addSnapshot(snapshot);

    expect(snapshot.parent).toEqual(suite);
  });
});

describe('fullTitle', () => {
  it('returns title given no parent', () => {
    const suite = new Suite('title');

    expect(suite.fullTitle()).toEqual('title');
  });

  it('returns title given parent with no title', () => {
    const suite = new Suite('title');
    suite.parent = {
      fullTitle: () => '',
    };

    expect(suite.fullTitle()).toEqual('title');
  });

  it('returns combined title given parent with title', () => {
    const suite = new Suite('title');
    suite.parent = {
      fullTitle: () => 'parent title',
    };

    expect(suite.fullTitle()).toEqual('parent title: title');
  });
});

describe('getOptions', () => {
  it('returns an empty object given no options specified and no parent', () => {
    const suite = new Suite('title');

    expect(suite.getOptions()).toEqual({});
  });

  it('returns parent options given no options specified', () => {
    const suite = new Suite('title');
    suite.parent = {
      getOptions: () => ({ widths: [320, 768] }),
    };

    expect(suite.getOptions()).toEqual({ widths: [320, 768] });
  });

  it('options specified on suite override options on parent', () => {
    const suite = new Suite('title', { widths: [500, 1024] });
    suite.parent = {
      getOptions: () => ({ widths: [320, 768] }),
    };

    expect(suite.getOptions()).toEqual({ widths: [500, 1024] });
  });

  it('merges options on suite with options on parent', () => {
    const suite = new Suite('title', { minimumHeight: 300 });
    suite.parent = {
      getOptions: () => ({ widths: [320, 768] }),
    };

    expect(suite.getOptions()).toEqual({ minimumHeight: 300, widths: [320, 768] });
  });
});
