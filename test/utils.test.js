import {
  captureSerializedDOM,
  captureResponsiveDOM,
  getWidthsForResponsiveCapture,
  isResponsiveSnapshotCaptureEnabled
} from '../src/utils.js';

describe('getWidthsForResponsiveCapture', () => {
  it('merges mobile and user widths, then adds config defaults', () => {
    const user = [320, 375, 768];
    const eligible = { mobile: [375, 414], config: [1024, 1280] };
    expect(getWidthsForResponsiveCapture(user, eligible))
      .toEqual([375, 414, 320, 768]);
  });

  it('falls back to config widths when user provided none', () => {
    const eligible = { mobile: [], config: [800, 1200] };
    expect(getWidthsForResponsiveCapture(undefined, eligible))
      .toEqual([800, 1200]);
  });

  it('falls back to mobile widths when config provided none', () => {
    const eligible = { mobile: [400, 500], config: [] };
    expect(getWidthsForResponsiveCapture(undefined, eligible))
      .toEqual([400, 500]);
  });

  it('filters out duplicates and falsy values', () => {
    const eligible = { mobile: [375, 0, 1280], config: [1280, null] };
    expect(getWidthsForResponsiveCapture([375, 1280, 0], eligible))
      .toEqual([375, 1280]);
  });
});

describe('isResponsiveSnapshotCaptureEnabled', () => {
  it('respects the option flag when set', () => {
    expect(isResponsiveSnapshotCaptureEnabled(
      { responsiveSnapshotCapture: true },
      {}
    )).toBe(true);

    expect(isResponsiveSnapshotCaptureEnabled(
      { responsiveSnapshotCapture: false },
      {}
    )).toBe(false);
  });

  it('falls back to config when option flag is absent', () => {
    expect(isResponsiveSnapshotCaptureEnabled(
      {},
      { snapshot: { responsiveSnapshotCapture: true } }
    )).toBe(true);

    expect(isResponsiveSnapshotCaptureEnabled(
      {},
      { snapshot: { responsiveSnapshotCapture: false } }
    )).toBe(false);
  });

  it('returns false when neither option nor config is set', () => {
    expect(isResponsiveSnapshotCaptureEnabled({}, {})).toBe(false);
  });

  it('gives priority to the option flag over config', () => {
    // option says false, config says true → false
    expect(isResponsiveSnapshotCaptureEnabled(
      { responsiveSnapshotCapture: false },
      { snapshot: { responsiveSnapshotCapture: true } }
    )).toBe(false);

    // option says true, config says false → true
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

  it('returns the snapshot when page.snapshot succeeds', async () => {
    page.snapshot.and.returnValue(Promise.resolve({ domSnapshot: '<html>ok</html>' }));
    const result = await captureSerializedDOM(page, {}, log);
    expect(result).toBe('<html>ok</html>');
  });

  it('logs and rethrows when page.snapshot fails', async () => {
    page.snapshot.and.returnValue(Promise.reject(new Error('fail')));
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
    // initial size stub
    page.eval.and.callFake(async () => ({ width: 375, height: 600 }));

    percy = {
      config: { snapshot: { minHeight: 600 } }
    };

    log = {
      debug: jasmine.createSpy('debug'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error')
    };

    // stub out captureSerializedDOM so we don't enter its real logic
    spyOn(window, 'captureSerializedDOM')
      .and.callFake(async () => ({ domSnapshot: '<html>resp</html>' }));
  });

  it('produces snapshots at each width in the list', async () => {
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
  const parse = (str) =>
    str
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));

  it('turns "375,768,1280" into [375,768,1280]', () => {
    expect(parse('375,768,1280')).toEqual([375, 768, 1280]);
  });

  it('ignores bad entries and trims spaces', () => {
    expect(parse(' 375 , 768 , abc , 1280 '))
      .toEqual([375, 768, 1280]);
  });

  it('returns [] for an empty string', () => {
    expect(parse('')).toEqual([]);
  });
});
