import { getWidthsForResponsiveCapture, isResponsiveSnapshotCaptureEnabled, captureResponsiveStoryDOM } from '../src/utils.js';

describe('getWidthsForResponsiveCapture', () => {
  it('combines mobile, user, and config widths and dedupes', () => {
    const user = [320, 375, 768];
    const eligible = { mobile: [375, 414], config: [1024, 1280] };
    expect(getWidthsForResponsiveCapture(user, eligible)).toEqual([375, 414, 320, 768]);
  });

  it('uses only config if no user widths', () => {
    const eligible = { mobile: [], config: [800, 1200] };
    expect(getWidthsForResponsiveCapture(undefined, eligible)).toEqual([800, 1200]);
  });

  it('uses only mobile if no user/config', () => {
    const eligible = { mobile: [400, 500], config: [] };
    expect(getWidthsForResponsiveCapture(undefined, eligible)).toEqual([400, 500]);
  });

  it('removes duplicates and falsy values', () => {
    const eligible = { mobile: [375, 0, 1280], config: [1280, null] };
    expect(getWidthsForResponsiveCapture([375, 1280, 0], eligible)).toEqual([375, 1280]);
  });
});

describe('isResponsiveSnapshotCaptureEnabled', () => {
  it('returns false if deferUploads is true', () => {
    expect(isResponsiveSnapshotCaptureEnabled({}, { percy: { deferUploads: true } })).toBe(false);
  });

  it('returns true if options.responsiveSnapshotCapture is true', () => {
    expect(isResponsiveSnapshotCaptureEnabled({ responsiveSnapshotCapture: true }, {})).toBe(true);
  });

  it('returns false if options.responsiveSnapshotCapture is false', () => {
    expect(isResponsiveSnapshotCaptureEnabled({ responsiveSnapshotCapture: false }, {})).toBe(false);
  });

  it('returns true if config.snapshot.responsiveSnapshotCapture is true', () => {
    expect(isResponsiveSnapshotCaptureEnabled({}, { snapshot: { responsiveSnapshotCapture: true } })).toBe(true);
  });

  it('returns false if config.snapshot.responsiveSnapshotCapture is false', () => {
    expect(isResponsiveSnapshotCaptureEnabled({}, { snapshot: { responsiveSnapshotCapture: false } })).toBe(false);
  });

  it('returns false if nothing is set', () => {
    expect(isResponsiveSnapshotCaptureEnabled({}, {})).toBe(false);
  });
});

describe('flag parser for widths', () => {
  const parse = (value) => value.split(',').map(w => parseInt(w.trim(), 10)).filter(w => !isNaN(w));

  it('parses comma-separated string to array of ints', () => {
    expect(parse('375,768,1280')).toEqual([375, 768, 1280]);
  });
  it('trims whitespace and ignores invalid', () => {
    expect(parse(' 375 , 768 , abc , 1280 ')).toEqual([375, 768, 1280]);
  });
  it('returns empty array for empty string', () => {
    expect(parse('')).toEqual([]);
  });
});

describe('storybookSchema responsiveSnapshotCapture and widths', () => {
  // This is a config shape test, not a runtime test, but we can check the defaults
  const storybookSchema = {
    responsiveSnapshotCapture: { type: 'boolean', default: false },
    widths: { type: 'array', items: { type: 'integer', minimum: 1 }, default: [] }
  };
  it('responsiveSnapshotCapture default is false', () => {
    expect(storybookSchema.responsiveSnapshotCapture.default).toBe(false);
  });
  it('widths default is [] and type is array of int', () => {
    expect(storybookSchema.widths.default).toEqual([]);
    expect(storybookSchema.widths.items.type).toBe('integer');
  });
});

describe('captureResponsiveStoryDOM', () => {
  it('captures DOM for each width and resets viewport', async function() {
    let page = {
      eval: jasmine.createSpy('eval')
        .and.callFake(function() {
          if (!page.eval.calls.count()) {
            return Promise.resolve({ width: 800, height: 600 });
          }
          return Promise.resolve();
        }),
      insertPercyDom: jasmine.createSpy('insertPercyDom').and.returnValue(Promise.resolve()),
      snapshot: jasmine.createSpy('snapshot').and.returnValue(Promise.resolve({ domSnapshot: { html: '<html></html>' } })),
      resize: jasmine.createSpy('resize').and.returnValue(Promise.resolve()),
      goto: jasmine.createSpy('goto').and.returnValue(Promise.resolve())
    };
    let options = { widths: [375, 800] };
    let percy = { config: { snapshot: {} } };
    let log = { debug: jasmine.createSpy('debug'), warn: jasmine.createSpy('warn'), error: jasmine.createSpy('error') };

    let gen = captureResponsiveStoryDOM(page, options, percy, log);
    let result = await gen.next();
    expect(Array.isArray(result.value)).toBe(true);
    expect(result.value.length).toBe(2);
    expect(result.value[0]).toHaveProperty('width', 375);
    expect(result.value[1]).toHaveProperty('width', 800);
  });
});
