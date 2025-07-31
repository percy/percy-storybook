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

// Note: changeViewportDimensionAndWait is an internal function, so we test it indirectly
// through captureResponsiveDOM which calls it
describe('captureResponsiveDOM viewport resizing behavior', () => {
  let page, percy, log;

  beforeEach(() => {
    page = {
      eval: jasmine.createSpy('eval').and.callFake(async (fn, args) => {
        // Mock different eval calls based on function content
        if (fn.toString().includes('window.innerWidth')) {
          return { width: 375, height: 667 };
        } else if (fn.toString().includes('window.resizeCount')) {
          return undefined; // Simulate resize completion
        } else if (fn.toString().includes('window.outerHeight')) {
          return 800; // Mock height calculation
        }
        return undefined;
      }),
      resize: jasmine.createSpy('resize').and.returnValue(Promise.resolve()),
      goto: jasmine.createSpy('goto').and.returnValue(Promise.resolve()),
      insertPercyDom: jasmine.createSpy('insertPercyDom').and.returnValue(Promise.resolve()),
      snapshot: jasmine.createSpy('snapshot').and.returnValue(Promise.resolve({
        dom: '<html>test</html>',
        domSnapshot: '<html>test</html>'
      }))
    };

    percy = {
      config: { snapshot: { minHeight: 600 } }
    };

    log = {
      debug: jasmine.createSpy('debug'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error')
    };

    // Mock captureSerializedDOM to return a simple DOM snapshot
    spyOn(utils, 'captureSerializedDOM').and.returnValue(
      Promise.resolve('<html>test</html>')
    );
  });

  it('successfully resizes viewport using CDP method during responsive capture', async () => {
    const options = { widths: [768, 1024] };

    await utils.captureResponsiveDOM(page, options, percy, log);

    // Should call resize for each width
    expect(page.resize).toHaveBeenCalledWith({
      width: 768,
      height: 667,
      deviceScaleFactor: 1,
      mobile: false
    });

    expect(page.resize).toHaveBeenCalledWith({
      width: 1024,
      height: 667,
      deviceScaleFactor: 1,
      mobile: false
    });

    expect(log.debug).toHaveBeenCalledWith('Resizing viewport to width=768, height=667, resizeCount=1');
    expect(log.debug).toHaveBeenCalledWith('Resizing viewport to width=1024, height=667, resizeCount=2');
  });

  it('handles CDP resize failure and logs fallback attempt', async () => {
    const cdpError = new Error('CDP resize failed');
    page.resize.and.returnValue(Promise.reject(cdpError));

    const options = { widths: [800] };

    await utils.captureResponsiveDOM(page, options, percy, log);

    expect(page.resize).toHaveBeenCalled();
    expect(log.debug).toHaveBeenCalledWith(
      'Resizing using CDP failed, falling back to page eval for width',
      800,
      cdpError
    );

    // Should call page.eval for fallback resize
    expect(page.eval).toHaveBeenCalledWith(
      jasmine.any(Function),
      { width: 800, height: 667 }
    );
  });

  it('handles complete resize failure gracefully', async () => {
    const cdpError = new Error('CDP failed');
    const fallbackError = new Error('Fallback failed');

    page.resize.and.returnValue(Promise.reject(cdpError));

    // Mock page.eval to fail for fallback resize but succeed for other calls
    page.eval.and.callFake(async (fn, args) => {
      if (args && (args.width || args.height)) {
        throw fallbackError; // Fallback resize fails
      }
      // Other eval calls succeed
      if (fn.toString().includes('window.innerWidth')) {
        return { width: 375, height: 667 };
      }
      return undefined;
    });

    const options = { widths: [600] };

    await expectAsync(
      utils.captureResponsiveDOM(page, options, percy, log)
    ).toBeRejectedWithError(/Failed to resize viewport using both CDP and page.eval: Fallback failed/);

    expect(log.error).toHaveBeenCalledWith(
      'Fallback resize using page.eval failed',
      fallbackError
    );
  });

  it('waits for resize completion and handles timeout gracefully', async () => {
    // Create a more controlled mock for the timeout scenario
    let evalCallCount = 0;
    const timeoutError = new Error('Timeout');

    page.eval.and.callFake(async (fn, args) => {
      evalCallCount++;

      if (fn.toString().includes('window.innerWidth')) {
        return { width: 375, height: 667 };
      } else if (fn.toString().includes('window.outerHeight')) {
        return 800;
      } else if (fn.toString().includes('window.resizeCount')) {
        return undefined; // Setup resize count
      } else if (args && args.resizeCount) {
        // This is the resize completion check - throw timeout on first call
        if (evalCallCount <= 5) { // Allow some setup calls first
          throw timeoutError;
        }
        return undefined;
      }
      return undefined;
    });

    const options = { widths: [414] };

    // Should not throw, just log timeout
    await utils.captureResponsiveDOM(page, options, percy, log);

    expect(log.debug).toHaveBeenCalledWith(
      'Timed out waiting for window resize event for width',
      414,
      timeoutError
    );
  });

  it('resets viewport to original size after responsive capture', async () => {
    const options = { widths: [768, 1024] };

    await utils.captureResponsiveDOM(page, options, percy, log);

    // Should reset to original size (375x667 as mocked)
    expect(page.resize).toHaveBeenCalledWith({
      width: 375,
      height: 667,
      deviceScaleFactor: 1,
      mobile: false
    });

    expect(log.debug).toHaveBeenCalledWith('Resetting viewport to original size after responsive capture');
  });

  it('uses custom minHeight when environment variable is set', async () => {
    // Set environment variable
    process.env.PERCY_RESPONSIVE_CAPTURE_MIN_HEIGHT = 'true';

    // Mock the outerHeight calculation to return 800
    page.eval.and.callFake(async (fn, args) => {
      if (fn.toString().includes('window.innerWidth')) {
        return { width: 375, height: 667 };
      } else if (fn.toString().includes('window.outerHeight')) {
        return 800; // This will result in height = 800
      } else if (fn.toString().includes('window.resizeCount')) {
        return undefined;
      }
      return undefined;
    });

    const options = { widths: [320] };

    await utils.captureResponsiveDOM(page, options, percy, log);

    expect(log.debug).toHaveBeenCalledWith('Using custom minHeight for responsive capture: 800');

    // Clean up
    delete process.env.PERCY_RESPONSIVE_CAPTURE_MIN_HEIGHT;
  });

  it('handles page reload when environment variable is set', async () => {
    process.env.PERCY_RESPONSIVE_CAPTURE_RELOAD_PAGE = 'true';

    // Mock current URL
    page.eval.and.callFake(async (fn, args) => {
      if (fn.toString().includes('window.location.href')) {
        return 'http://localhost:6006/iframe.html?id=test';
      } else if (fn.toString().includes('window.innerWidth')) {
        return { width: 375, height: 667 };
      }
      return undefined;
    });

    const options = { widths: [480] };

    await utils.captureResponsiveDOM(page, options, percy, log);

    expect(log.debug).toHaveBeenCalledWith('Reloading page for responsive capture');
    expect(page.goto).toHaveBeenCalledWith('http://localhost:6006/iframe.html?id=test', { forceReload: true });
    expect(page.insertPercyDom).toHaveBeenCalled();

    // Clean up
    delete process.env.PERCY_RESPONSIVE_CAPTURE_RELOAD_PAGE;
  });

  it('respects sleep time environment variable', async () => {
    process.env.PERCY_RESPONSIVE_CAPTURE_SLEEP_TIME = '2';

    const options = { widths: [600] };

    await utils.captureResponsiveDOM(page, options, percy, log);

    expect(log.debug).toHaveBeenCalledWith('Sleeping for 2 seconds before capturing snapshot');

    // Clean up
    delete process.env.PERCY_RESPONSIVE_CAPTURE_SLEEP_TIME;
  });
});
