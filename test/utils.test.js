import * as utils from '../src/utils.js';

describe('getWidthsForDomCapture', () => {
  it('merges mobile and user widths, then adds config defaults', () => {
    const user = [320, 375, 768];
    const eligible = { mobile: [375, 414], config: [1024, 1280] };
    expect(utils.getWidthsForDomCapture(user, eligible)).toEqual([375, 414, 320, 768]);
  });

  it('falls back to config widths when user provided none', () => {
    const eligible = { mobile: [], config: [800, 1200] };
    expect(utils.getWidthsForDomCapture(undefined, eligible)).toEqual([800, 1200]);
  });

  it('falls back to mobile widths when config provided none', () => {
    const eligible = { mobile: [400, 500], config: [] };
    expect(utils.getWidthsForDomCapture(undefined, eligible)).toEqual([400, 500]);
  });

  it('filters out duplicates and falsy values', () => {
    const eligible = { mobile: [375, 0, 1280], config: [1280, null] };
    expect(utils.getWidthsForDomCapture([375, 1280, 0], eligible)).toEqual([375, 1280]);
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

describe('changeViewportDimensionAndWait', () => {
  let page, log;

  beforeEach(() => {
    page = {
      resize: jasmine.createSpy('resize').and.returnValue(Promise.resolve()),
      eval: jasmine.createSpy('eval').and.returnValue(Promise.resolve())
    };

    log = {
      debug: jasmine.createSpy('debug'),
      error: jasmine.createSpy('error')
    };
  });

  it('successfully resizes using CDP method', async () => {
    await utils.changeViewportDimensionAndWait(page, 1024, 768, 1, log);

    expect(page.resize).toHaveBeenCalledWith({
      width: 1024,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false
    });

    expect(page.eval).toHaveBeenCalledTimes(1); // Only for resize completion check
    expect(log.debug).not.toHaveBeenCalledWith(jasmine.stringMatching(/CDP failed/));
  });

  it('falls back to page.eval when CDP resize fails', async () => {
    const cdpError = new Error('CDP resize failed');
    page.resize.and.returnValue(Promise.reject(cdpError));

    await utils.changeViewportDimensionAndWait(page, 800, 600, 2, log);

    expect(page.resize).toHaveBeenCalledWith({
      width: 800,
      height: 600,
      deviceScaleFactor: 1,
      mobile: false
    });

    expect(log.debug).toHaveBeenCalledWith(
      'Resizing using CDP failed, falling back to page eval for width',
      800,
      cdpError
    );

    expect(page.eval).toHaveBeenCalledWith(
      jasmine.any(Function),
      { width: 800, height: 600 }
    );
  });

  it('throws error when both CDP and fallback methods fail', async () => {
    const cdpError = new Error('CDP failed');
    const fallbackError = new Error('Fallback failed');

    page.resize.and.returnValue(Promise.reject(cdpError));
    page.eval.and.returnValues(
      Promise.reject(fallbackError), // First eval call (fallback resize)
      Promise.resolve() // This won't be reached
    );

    await expectAsync(
      utils.changeViewportDimensionAndWait(page, 1200, 800, 3, log)
    ).toBeRejectedWithError(/Failed to resize viewport using both CDP and page.eval: Fallback failed/);

    expect(log.error).toHaveBeenCalledWith(
      'Fallback resize using page.eval failed',
      fallbackError
    );
  });

  it('waits for resize completion successfully', async () => {
    // Mock successful resize completion check
    page.eval.and.returnValues(Promise.resolve());// Resize completion check

    await utils.changeViewportDimensionAndWait(page, 375, 667, 1, log);

    expect(page.eval).toHaveBeenCalledWith(
      jasmine.any(Function),
      { resizeCount: 1 }
    );
  });

  it('handles timeout while waiting for resize completion', async () => {
    const timeoutError = new Error('Timeout');

    page.eval.and.returnValues(
      Promise.reject(timeoutError) // Resize completion check times out
    );

    // Should not throw, just log debug message
    await utils.changeViewportDimensionAndWait(page, 414, 736, 2, log);

    expect(log.debug).toHaveBeenCalledWith(
      'Timed out waiting for window resize event for width',
      414,
      timeoutError
    );
  });

  it('calls page.eval with correct resize function for fallback', async () => {
    page.resize.and.returnValue(Promise.reject(new Error('CDP failed')));

    await utils.changeViewportDimensionAndWait(page, 768, 1024, 1, log);

    // Check that the fallback eval was called with the right function
    const fallbackCall = page.eval.calls.all().find(call =>
      call.args[1] && call.args[1].width === 768 && call.args[1].height === 1024
    );

    expect(fallbackCall).toBeDefined();
    expect(fallbackCall.args[0]).toEqual(jasmine.any(Function));
    expect(fallbackCall.args[1]).toEqual({ width: 768, height: 1024 });
  });

  it('calls page.eval with correct resize completion check function', async () => {
    await utils.changeViewportDimensionAndWait(page, 1440, 900, 5, log);

    // Check that resize completion check was called
    const completionCall = page.eval.calls.all().find(call =>
      call.args[1] && call.args[1].resizeCount === 5
    );

    expect(completionCall).toBeDefined();
    expect(completionCall.args[0]).toEqual(jasmine.any(Function));
    expect(completionCall.args[1]).toEqual({ resizeCount: 5 });
  });

  it('handles mixed success and failure scenarios', async () => {
    // CDP succeeds, but resize completion times out
    const timeoutError = new Error('Timeout waiting for resize');

    page.eval.and.returnValue(Promise.reject(timeoutError));

    await utils.changeViewportDimensionAndWait(page, 320, 568, 3, log);

    expect(page.resize).toHaveBeenCalledWith({
      width: 320,
      height: 568,
      deviceScaleFactor: 1,
      mobile: false
    });

    expect(log.debug).toHaveBeenCalledWith(
      'Timed out waiting for window resize event for width',
      320,
      timeoutError
    );

    // Should not have called fallback debug message since CDP succeeded
    expect(log.debug).not.toHaveBeenCalledWith(
      jasmine.stringMatching(/CDP failed/)
    );
  });

  it('preserves deviceScaleFactor and mobile settings in CDP call', async () => {
    await utils.changeViewportDimensionAndWait(page, 600, 800, 1, log);

    expect(page.resize).toHaveBeenCalledWith({
      width: 600,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });
  });

  it('handles zero dimensions', async () => {
    await utils.changeViewportDimensionAndWait(page, 0, 0, 1, log);

    expect(page.resize).toHaveBeenCalledWith({
      width: 0,
      height: 0,
      deviceScaleFactor: 1,
      mobile: false
    });
  });
});
