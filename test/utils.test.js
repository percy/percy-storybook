import * as utils from '../src/utils.js';

describe('getWidthsForResponsiveCapture', () => {
  it('merges mobile and user widths, then adds config defaults', () => {
    const user = [320, 375, 768];
    const eligible = { mobile: [375, 414], config: [1024, 1280] };
    expect(utils.getWidthsForResponsiveCapture(user, eligible)).toEqual([375, 414, 320, 768]);
  });

  it('falls back to config widths when user provided none', () => {
    const eligible = { mobile: [], config: [800, 1200] };
    expect(utils.getWidthsForResponsiveCapture(undefined, eligible)).toEqual([800, 1200]);
  });

  it('falls back to mobile widths when config provided none', () => {
    const eligible = { mobile: [400, 500], config: [] };
    expect(utils.getWidthsForResponsiveCapture(undefined, eligible)).toEqual([400, 500]);
  });

  it('filters out duplicates and falsy values', () => {
    const eligible = { mobile: [375, 0, 1280], config: [1280, null] };
    expect(utils.getWidthsForResponsiveCapture([375, 1280, 0], eligible)).toEqual([375, 1280]);
  });
});

describe('isResponsiveSnapshotCaptureEnabled', () => {
  it('respects the option flag when set', () => {
    expect(utils.isResponsiveSnapshotCaptureEnabled({ responsiveSnapshotCapture: true }, {})).toBe(true);
    expect(utils.isResponsiveSnapshotCaptureEnabled({ responsiveSnapshotCapture: false }, {})).toBe(false);
  });

  it('falls back to config when option flag is absent', () => {
    expect(utils.isResponsiveSnapshotCaptureEnabled({}, { snapshot: { responsiveSnapshotCapture: true } })).toBe(true);
    expect(utils.isResponsiveSnapshotCaptureEnabled({}, { snapshot: { responsiveSnapshotCapture: false } })).toBe(false);
  });

  it('returns false when neither option nor config is set', () => {
    expect(utils.isResponsiveSnapshotCaptureEnabled({}, {})).toBe(false);
  });

  it('gives priority to the option flag over config', () => {
    expect(utils.isResponsiveSnapshotCaptureEnabled(
      { responsiveSnapshotCapture: false },
      { snapshot: { responsiveSnapshotCapture: true } }
    )).toBe(false);
    expect(utils.isResponsiveSnapshotCaptureEnabled(
      { responsiveSnapshotCapture: true },
      { snapshot: { responsiveSnapshotCapture: false } }
    )).toBe(true);
  });
});

describe('captureSerializedDOM', () => {
  let page, log;

  beforeEach(() => {
    page = {
      snapshot: jasmine.createSpy('snapshot').and.returnValue(
        Promise.resolve({ domSnapshot: '<html>ok</html>' })
      ),
      eval: jasmine.createSpy('eval')
    };
    log = {
      debug: jasmine.createSpy('debug'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error')
    };
  });

  it('returns the snapshot when page.snapshot succeeds', async () => {
    const result = await utils.captureSerializedDOM(page, {}, log);
    expect(result).toBe('<html>ok</html>');
  });

  it('logs and rethrows when page.snapshot fails', async () => {
    page.snapshot.and.returnValue(Promise.reject(new Error('fail')));
    await expectAsync(utils.captureSerializedDOM(page, {}, log)).toBeRejectedWithError(/Failed to capture DOM snapshot/);
    expect(log.error).toHaveBeenCalled();
  });
});

describe('captureResponsiveDOM', () => {
  let page, percy, log;

  beforeEach(() => {
    page = {
      eval: jasmine.createSpy('eval').and.callFake(async (fn) => {
        if (fn.toString().includes('window.innerWidth')) {
          return { width: 375, height: 600 };
        } else if (fn.toString().includes('window.resizeCount')) {
          return undefined;
        }
        return undefined;
      }),
      resize: jasmine.createSpy('resize').and.returnValue(Promise.resolve()),
      goto: jasmine.createSpy('goto').and.returnValue(Promise.resolve()),
      insertPercyDom: jasmine.createSpy('insertPercyDom').and.returnValue(Promise.resolve()),
      snapshot: jasmine.createSpy('snapshot').and.returnValue(
        Promise.resolve({ domSnapshot: { html: '<html>resp</html>' } })
      )
    };

    percy = {
      config: { snapshot: { minHeight: 600 } }
    };

    log = {
      debug: jasmine.createSpy('debug'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error')
    };

    // Mock captureSerializedDOM correctly
    spyOn(utils, 'captureSerializedDOM').and.returnValue(
      Promise.resolve({ domSnapshot: { html: '<html>resp</html>' } })
    );
  });

  it('produces snapshots at each width in the list', async () => {
    const options = { widths: [800, 1024] };
    const result = await utils.captureResponsiveDOM(page, options, percy, log);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(utils.captureSerializedDOM).toHaveBeenCalledTimes(2);
  });
});

// --- flag parser for widths ---
describe('flag parser for widths', () => {
  const parse = (str) =>
    str
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));

  it('turns "375,768,1280" into [375,768,1280]', () => {
    expect(parse('375,768,1280')).toEqual([375, 768, 1280]);
  });

  it('ignores bad entries and trims spaces', () => {
    expect(parse(' 375 , 768 , abc , 1280 ')).toEqual([375, 768, 1280]);
  });

  it('returns [] for an empty string', () => {
    expect(parse('')).toEqual([]);
  });
});
