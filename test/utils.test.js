import {
  captureSerializedDOM,
  captureResponsiveDOM,
  getWidthsForResponsiveCapture,
  isResponsiveSnapshotCaptureEnabled
} from '../src/utils.js';

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
  it('returns true if options.responsiveSnapshotCapture is true', () => {
    expect(isResponsiveSnapshotCaptureEnabled(
      { responsiveSnapshotCapture: true },
      {}
    )).toBe(true);
  });

  it('returns false if options.responsiveSnapshotCapture is false', () => {
    expect(isResponsiveSnapshotCaptureEnabled(
      { responsiveSnapshotCapture: false },
      {}
    )).toBe(false);
  });

  it('returns true if config.snapshot.responsiveSnapshotCapture is true', () => {
    expect(isResponsiveSnapshotCaptureEnabled(
      {},
      { snapshot: { responsiveSnapshotCapture: true } }
    )).toBe(true);
  });

  it('returns false if config.snapshot.responsiveSnapshotCapture is false', () => {
    expect(isResponsiveSnapshotCaptureEnabled(
      {},
      { snapshot: { responsiveSnapshotCapture: false } }
    )).toBe(false);
  });

  it('returns false if nothing is set', () => {
    expect(isResponsiveSnapshotCaptureEnabled({}, {})).toBe(false);
  });

  it('snapshot option takes precedence over global config', () => {
    expect(isResponsiveSnapshotCaptureEnabled(
      { responsiveSnapshotCapture: false },
      { snapshot: { responsiveSnapshotCapture: true } }
    )).toBe(false);
    expect(isResponsiveSnapshotCaptureEnabled(
      { responsiveSnapshotCapture: true },
      { snapshot: { responsiveSnapshotCapture: false } }
    )).toBe(true);
  });
});

describe('captureSerializedDOM', () => {
  let page, log;

  beforeEach(() => {
    page = {
      snapshot: jasmine.createSpy('snapshot'),
      eval: jasmine.createSpy('eval')
    };
    log = {
      debug: jasmine.createSpy('debug'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error')
    };
  });

  it('returns domSnapshot when snapshot succeeds', async () => {
    page.snapshot.and.returnValue(Promise.resolve({ domSnapshot: '<html>ok</html>' }));
    const result = await captureSerializedDOM(page, {}, log);
    expect(result).toBe('<html>ok</html>');
    expect(page.snapshot).toHaveBeenCalled();
  });

  it('throws and logs error when snapshot fails', async () => {
    const error = new Error('fail');
    page.snapshot.and.returnValue(Promise.reject(error));
    await expectAsync(captureSerializedDOM(page, {}, log))
      .toBeRejectedWithError(/Failed to capture DOM snapshot/);
    expect(log.error).toHaveBeenCalled();
  });
});

describe('captureResponsiveDOM', () => {
  let page, percy, log;

  beforeEach(() => {
    page = {
      eval: jasmine.createSpy('eval'),
      resize: jasmine.createSpy('resize'),
      goto: jasmine.createSpy('goto'),
      insertPercyDom: jasmine.createSpy('insertPercyDom')
    };
    // initial viewport
    page.eval.and.callFake(async () => ({ width: 375, height: 600 }));

    percy = { config: { snapshot: { minHeight: 600 } } };

    log = {
      debug: jasmine.createSpy('debug'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error')
    };

    // stub captureSerializedDOM to isolate resize logic
    spyOn(
      require('../src/utils.js'),
      'captureSerializedDOM'
    ).and.callFake(async (p, opts, lg) => ({ domSnapshot: '<html>resp</html>' }));
  });

  it('returns array of domSnapshots with correct widths', async () => {
    const options = { widths: [800, 1024] };
    const result = await captureResponsiveDOM(page, options, percy, log);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].width).toBe(800);
    expect(result[1].width).toBe(1024);
    expect(result[0].domSnapshot).toBe('<html>resp</html>');
  });
});

// --- flag parser for widths ---
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
