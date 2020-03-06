import selectStories, { InvalidOptionError } from '../../src/selectStories';

describe('selectStories', () => {
  it('returns empty array for an empty array', () => {
    expect(selectStories([])).toEqual([]);
  });

  it('returns expected selected stories for a stories array', () => {
    const stories = [
      { name: 'a', kind: 'ImagePost' },
      { name: 'b', kind: 'ImagePost' },
      { name: 'a', kind: 'LinkPost' },
      { name: 'b', kind: 'LinkPost' }
    ];

    const expectedSelectedStories = [
      {
        encodedParams: 'selectedKind=ImagePost&selectedStory=a',
        name: 'ImagePost: a',
        options: {}
      },
      {
        encodedParams: 'selectedKind=ImagePost&selectedStory=b',
        name: 'ImagePost: b',
        options: {}
      },
      {
        encodedParams: 'selectedKind=LinkPost&selectedStory=a',
        name: 'LinkPost: a',
        options: {}
      },
      {
        encodedParams: 'selectedKind=LinkPost&selectedStory=b',
        name: 'LinkPost: b',
        options: {}
      }
    ];

    expect(selectStories(stories)).toEqual(expectedSelectedStories);
  });

  it('adds rtl stories when requested', () => {
    const stories = [
      { name: 'a', kind: 'ImagePost' },
      { name: 'b', kind: 'ImagePost' }
    ];

    const expectedSelectedStories = [
      {
        encodedParams: 'selectedKind=ImagePost&selectedStory=a',
        name: 'ImagePost: a',
        options: {}
      },
      {
        encodedParams: 'selectedKind=ImagePost&selectedStory=b',
        name: 'ImagePost: b',
        options: {}
      },
      {
        encodedParams: 'selectedKind=ImagePost&selectedStory=a&direction=rtl',
        name: 'ImagePost: a [RTL]',
        options: {}
      },
      {
        encodedParams: 'selectedKind=ImagePost&selectedStory=b&direction=rtl',
        name: 'ImagePost: b [RTL]',
        options: {}
      }
    ];

    expect(selectStories(stories, /.*/gim)).toEqual(expectedSelectedStories);
  });

  describe('rtl option', () => {
    it('adds a story to RTL list when enabled', () => {
      const parameters = { percy: { rtl: true } };
      const stories = [
        { name: 'a', kind: 'ImagePost', parameters: parameters },
        { name: 'b', kind: 'ImagePost' }
      ];

      const expectedSelectedStories = [
        {
          encodedParams: 'selectedKind=ImagePost&selectedStory=a',
          name: 'ImagePost: a',
          options: { rtl: true }
        },
        {
          encodedParams: 'selectedKind=ImagePost&selectedStory=b',
          name: 'ImagePost: b',
          options: {}
        },
        {
          encodedParams: 'selectedKind=ImagePost&selectedStory=a&direction=rtl',
          name: 'ImagePost: a [RTL]',
          options: { rtl: true }
        }
      ];

      expect(selectStories(stories)).toEqual(expectedSelectedStories);
    });

    it('trumps rtl_regex setting', () => {
      const parameters = { percy: { rtl: false } };
      const stories = [
        { name: 'a', kind: 'ImagePost', parameters: parameters },
        { name: 'b', kind: 'ImagePost' }
      ];

      const expectedSelectedStories = [
        {
          encodedParams: 'selectedKind=ImagePost&selectedStory=a',
          name: 'ImagePost: a',
          options: { rtl: false }
        },
        {
          encodedParams: 'selectedKind=ImagePost&selectedStory=b',
          name: 'ImagePost: b',
          options: {}
        },
        {
          encodedParams: 'selectedKind=ImagePost&selectedStory=b&direction=rtl',
          name: 'ImagePost: b [RTL]',
          options: {}
        }
      ];

      expect(selectStories(stories, /.*/gim)).toEqual(expectedSelectedStories);
    });

    it('rejects a non boolean value', () => {
      const parameters = { percy: { rtl: 'yes please' } };
      const stories = [{ name: 'a', kind: 'ImagePost', parameters: parameters }];
      expect(() => selectStories(stories)).toThrow(
        new InvalidOptionError("Given rtl option 'yes please' is invalid")
      );
    });
  });

  describe('skip option', () => {
    it('excludes story when enabled', () => {
      const parameters = { percy: { skip: true } };
      const stories = [
        { name: 'a', kind: 'ImagePost', parameters: parameters },
        { name: 'b', kind: 'ImagePost' }
      ];

      const expectedSelectedStories = [
        {
          encodedParams: 'selectedKind=ImagePost&selectedStory=b',
          name: 'ImagePost: b',
          options: {}
        }
      ];

      expect(selectStories(stories)).toEqual(expectedSelectedStories);
    });

    it('trumps rtl option', () => {
      const parameters = { percy: { skip: true, rtl: true } };
      const stories = [
        { name: 'a', kind: 'ImagePost', parameters: parameters },
        { name: 'b', kind: 'ImagePost' }
      ];

      const expectedSelectedStories = [
        {
          encodedParams: 'selectedKind=ImagePost&selectedStory=b',
          name: 'ImagePost: b',
          options: {}
        },
        {
          encodedParams: 'selectedKind=ImagePost&selectedStory=b&direction=rtl',
          name: 'ImagePost: b [RTL]',
          options: {}
        }
      ];

      expect(selectStories(stories, /.*/gim)).toEqual(expectedSelectedStories);
    });

    it('rejects a non boolean value', () => {
      const parameters = { percy: { skip: 'yes please' } };
      const stories = [{ name: 'a', kind: 'ImagePost', parameters: parameters }];

      expect(() => selectStories(stories)).toThrow(
        new InvalidOptionError("Given skip option 'yes please' is invalid")
      );
    });
  });

  describe('widths option', () => {
    it('rejects a non boolean value', () => {
      const parameters = { percy: { widths: 'yes please' } };
      const stories = [{ name: 'a', kind: 'ImagePost', parameters: parameters }];

      expect(() => selectStories(stories)).toThrow(
        new InvalidOptionError("Given widths option 'yes please' is not an array")
      );
    });

    it('rejects empty widths', () => {
      const parameters = { percy: { widths: [] } };
      const stories = [{ name: 'a', kind: 'ImagePost', parameters: parameters }];

      expect(() => selectStories(stories)).toThrow(new InvalidOptionError('Need at least one valid width'));
    });

    it('rejects non-numeric widths', () => {
      const parameters = { percy: { widths: [1, 2, 'x'] } };
      const stories = [{ name: 'a', kind: 'ImagePost', parameters: parameters }];

      expect(() => selectStories(stories)).toThrow(new InvalidOptionError("Given width 'x' is invalid"));
    });

    it('accepts a widths array', () => {
      const parameters = { percy: { widths: [1, 2, 3] } };
      const stories = [{ name: 'a', kind: 'ImagePost', parameters: parameters }];

      expect(() => selectStories(stories)).not.toThrow();
    });
  });
});
