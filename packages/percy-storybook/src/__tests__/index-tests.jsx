import createPercyAddon, { InvalidOptionError } from '../';
import { storiesKey } from '../constants';

const kind = 'some kind';
const getStorybook = () => [
  {
    kind,
    stories: [
      { name: 'some story' },
      { name: 'some other story' },
    ]
  },
  {
    kind: 'some other kind',
    stories: [
      { name: 'another story' }
    ],
  },
];

describe('percyAddon', () => {
  let addon;
  let storiesOf;
  let book;
  let renderFn;

  beforeEach(() => {
    addon = createPercyAddon();
    storiesOf = jest.fn();
    storiesOf.mockReturnValue(Object.assign({
      add: jest.fn(),
      kind,
    }, addon.percyAddon));
    book = storiesOf(kind, module);
    renderFn = () => <div/>;
  });

  it('createPercyAddon', () => {
    expect(addon).toHaveProperty('percyAddon');
    expect(addon).toHaveProperty('serializeStories');
  });

  describe('addWithPercyOptions', () => {
    it('will accept storyFn as options', () => {
      book.addWithPercyOptions('some story', renderFn);
      expect(book.add).toHaveBeenCalledWith('some story', renderFn);
    });

    it('will accept empty options', () => {
      book.addWithPercyOptions('some story', {}, renderFn);
      expect(book.add).toHaveBeenCalledWith('some story', renderFn);
    });

    it('will accept falsy options', () => {
      book.addWithPercyOptions('some story', null, renderFn);
      expect(book.add).toHaveBeenCalledWith('some story', renderFn);
    });

    describe('widths', () => {
      it('rejects non-array widths', () => {
        expect(() => book.addWithPercyOptions('some story', { widths: 'x' }, renderFn))
          .toThrow(new InvalidOptionError('Given widths option is not an array'));
      });

      it('rejects empty widths', () => {
        expect(() => book.addWithPercyOptions('some story', { widths: [] }, renderFn))
          .toThrow(new InvalidOptionError('Need at least one valid width'));
      });

      it('rejects non-numeric widths', () => {
        expect(() => book.addWithPercyOptions('some story', { widths: [1, 2, 'x'] }, renderFn))
          .toThrow(new InvalidOptionError("Given width 'x' is invalid"));
      });

      it('accepts a widths array', () => {
        expect(() => book.addWithPercyOptions('some story', { widths: [1, 2, 3] }, renderFn)).not.toThrow();
      });
    });

    describe('rtl', () => {
      it('rejects non-boolean rtl options', () => {
        expect(() => book.addWithPercyOptions('some story', { rtl: 'of course' }, renderFn))
          .toThrow(new InvalidOptionError("Given rtl setting 'of course' is invalid"));
      });
      it('accepts a boolean option', () => {
        expect(() => book.addWithPercyOptions('some story', { rtl: true }, renderFn)).not.toThrow();
      });
    });
  });

  describe('serializeStories', () => {
    it('returns identity with no options added', () => {
      const result = getStorybook();
      expect(addon.serializeStories(getStorybook)).toEqual(result);
    });

    it('writes on window', () => {
      const oldWindow = global.window;
      global.window = {};
      addon.serializeStories(getStorybook);
      expect(global.window[storiesKey]).toEqual(getStorybook());
      global.window = oldWindow;
    });

    it('registers given options', () => {
      const options = { widths: [11, 22, 33], rtl: true };
      book.addWithPercyOptions('some story', options, renderFn);
      const expected = getStorybook();
      expected[0].stories[0] = { name: 'some story', options };
      expect(addon.serializeStories(getStorybook)).toEqual(expected);
    });
  });
});
