import * as utils from '../src/utils.js';

const MOCK_MOBILE_DEVICES = [
  { width: 375, height: 812 },
  { width: 414, height: 896 }
];

// Helper function to create percy mock with consistent device data
const createPercyMock = (config = {}) => ({
  client: {
    getDeviceDetails: jasmine.createSpy('getDeviceDetails').and.returnValue(Promise.resolve(MOCK_MOBILE_DEVICES))
  },
  config: {
    snapshot: { minHeight: 600, ...config }
  }
});

describe('getWidthsForDomCapture', () => {
  describe('responsive mode (with defaultHeight)', () => {
    it('merges mobile and user widths, desktop widths override mobile', () => {
      const user = [320, 375, 768];
      const eligible = {
        mobile: MOCK_MOBILE_DEVICES,
        config: [1024, 1280]
      };
      const defaultHeight = 1024;
      expect(utils.getWidthsForDomCapture(user, eligible, defaultHeight)).toEqual([
        { width: 375, height: 1024 },
        { width: 414, height: 896 },
        { width: 320, height: 1024 },
        { width: 768, height: 1024 }
      ]);
    });

    it('desktop widths override mobile heights when same width', () => {
      const user = [375];
      const eligible = {
        mobile: [MOCK_MOBILE_DEVICES[0]], // Use first device only
        config: []
      };
      const defaultHeight = 1024;
      expect(utils.getWidthsForDomCapture(user, eligible, defaultHeight)).toEqual([
        { width: 375, height: 1024 }
      ]);
    });

    it('falls back to config widths when user provided none', () => {
      const eligible = { mobile: [], config: [800, 1200] };
      const defaultHeight = 1024;
      expect(utils.getWidthsForDomCapture(undefined, eligible, defaultHeight)).toEqual([
        { width: 800, height: 1024 },
        { width: 1200, height: 1024 }
      ]);
    });

    it('uses only mobile widths when no desktop widths provided', () => {
      const eligible = {
        mobile: [{ width: 400, height: 800 }, { width: 500, height: 900 }],
        config: []
      };
      const defaultHeight = 1024;
      expect(utils.getWidthsForDomCapture(undefined, eligible, defaultHeight)).toEqual([
        { width: 400, height: 800 },
        { width: 500, height: 900 }
      ]);
    });

    it('filters out null/undefined but keeps zero values', () => {
      const eligible = {
        mobile: [{ width: 375, height: 812 }, { width: 0, height: 400 }, { width: 1280, height: 800 }],
        config: [1280, null]
      };
      expect(utils.getWidthsForDomCapture([375, 1280, 0], eligible, 1024)).toEqual([
        { width: 375, height: 1024 },
        { width: 0, height: 1024 },
        { width: 1280, height: 1024 }
      ]);
    });
  });

  describe('non-responsive mode (without defaultHeight)', () => {
    it('merges mobile and user widths, returns numbers array', () => {
      const user = [320, 768];
      const eligible = { mobile: [375, 414], config: [1024, 1280] };
      expect(utils.getWidthsForDomCapture(user, eligible)).toEqual([375, 414, 320, 768]);
    });

    it('falls back to config widths when user provided none', () => {
      const eligible = { mobile: [], config: [800, 1200] };
      expect(utils.getWidthsForDomCapture(undefined, eligible)).toEqual([800, 1200]);
    });

    it('uses only mobile widths when no config provided', () => {
      const eligible = { mobile: [400, 500], config: [] };
      expect(utils.getWidthsForDomCapture(undefined, eligible)).toEqual([400, 500]);
    });

    it('filters out null/undefined but keeps zero values', () => {
      const eligible = { mobile: [375, 0, 1280], config: [1280, null] };
      expect(utils.getWidthsForDomCapture([375, 1280, 0], eligible)).toEqual([375, 0, 1280]);
    });

    it('handles empty inputs gracefully', () => {
      const eligible = { mobile: [], config: [] };
      expect(utils.getWidthsForDomCapture([], eligible)).toEqual([]);
    });
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

    percy = createPercyMock();

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
    const story = { id: 'test-story', url: 'http://localhost:6006/iframe.html?id=test' };
    const result = await utils.captureResponsiveDOM(page, options, percy, log, story);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(4);

    // Check that all widths are included (mobile + user)
    const widths = result.map(r => r.width);
    expect(widths).toContain(375);
    expect(widths).toContain(414);
    expect(widths).toContain(800);
    expect(widths).toContain(1024);
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

    percy = createPercyMock();

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

    const story = { id: 'test-story', url: 'http://localhost:6006/iframe.html?id=test' };
    await utils.captureResponsiveDOM(page, options, percy, log, story);

    // Should call resize for all widths (mobile + user): 375, 414, 768, 1024
    // 375 gets resized (height change from 667 to 812)
    expect(page.resize).toHaveBeenCalledWith({
      width: 375,
      height: 812,
      deviceScaleFactor: 1,
      mobile: false
    });

    expect(page.resize).toHaveBeenCalledWith({
      width: 414,
      height: 896,
      deviceScaleFactor: 1,
      mobile: false
    });

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

    // Check the actual resize sequence from the logs (all now resize!)
    expect(log.debug).toHaveBeenCalledWith(jasmine.stringMatching(/Resizing viewport to width=375, height=812, resizeCount=1/));
    expect(log.debug).toHaveBeenCalledWith(jasmine.stringMatching(/Resizing viewport to width=414, height=896, resizeCount=2/));
    expect(log.debug).toHaveBeenCalledWith(jasmine.stringMatching(/Resizing viewport to width=768, height=667, resizeCount=3/));
    expect(log.debug).toHaveBeenCalledWith(jasmine.stringMatching(/Resizing viewport to width=1024, height=667, resizeCount=4/));
  });

  it('handles CDP resize failure and logs fallback attempt', async () => {
    const cdpError = new Error('CDP resize failed');
    page.resize.and.returnValue(Promise.reject(cdpError));

    const options = { widths: [800] };

    const story = { id: 'test-story', url: 'http://localhost:6006/iframe.html?id=test' };
    await utils.captureResponsiveDOM(page, options, percy, log, story);

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

    const options = { widths: [{ width: 600, height: 800 }] };

    await expectAsync(
      utils.captureResponsiveDOM(page, options, percy, log)
    ).toBeRejectedWithError(/Failed to resize viewport using both CDP and page.eval: Fallback failed/);

    expect(log.error).toHaveBeenCalledWith(
      'Fallback resize using page.eval failed',
      fallbackError
    );
  });

  it('resets viewport to original size after responsive capture', async () => {
    const options = { widths: [768, 1024] };

    const story = { id: 'test-story', url: 'http://localhost:6006/iframe.html?id=test' };
    await utils.captureResponsiveDOM(page, options, percy, log, story);

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

    const story = { id: 'test-story', url: 'http://localhost:6006/iframe.html?id=test' };
    await utils.captureResponsiveDOM(page, options, percy, log, story);

    expect(log.debug).toHaveBeenCalledWith('Using custom minHeight for responsive capture: 733');

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

    const story = { id: 'test-story', url: 'http://localhost:6006/iframe.html?id=test' };
    await utils.captureResponsiveDOM(page, options, percy, log, story);

    expect(log.debug).toHaveBeenCalledWith('Reloading page for responsive capture');
    expect(page.goto).toHaveBeenCalledWith('http://localhost:6006/iframe.html?id=test&viewMode=story', { forceReload: true });

    // Clean up
    delete process.env.PERCY_RESPONSIVE_CAPTURE_RELOAD_PAGE;
  });

  it('respects sleep time environment variable', async () => {
    process.env.RESPONSIVE_CAPTURE_SLEEP_TIME = '2';

    const options = { widths: [{ width: 600, height: 800 }] };

    const story = { id: 'test-story', url: 'http://localhost:6006/iframe.html?id=test' };
    await utils.captureResponsiveDOM(page, options, percy, log, story);

    expect(log.debug).toHaveBeenCalledWith('Sleeping for 2 seconds before capturing snapshot');

    // Clean up
    delete process.env.RESPONSIVE_CAPTURE_SLEEP_TIME;
  });
});

describe('captureResponsiveDOM environment variables', () => {
  let page, percy, log;

  beforeEach(() => {
    page = {
      eval: jasmine.createSpy('eval').and.callFake(async (fn, args) => {
        if (fn.toString().includes('window.innerWidth')) {
          return { width: 375, height: 667 };
        } else if (fn.toString().includes('window.outerHeight')) {
          return 800; // Mock outer height
        }
        return undefined;
      }),
      goto: jasmine.createSpy('goto'),
      resize: jasmine.createSpy('resize').and.returnValue(Promise.resolve()),
      insertPercyDom: jasmine.createSpy('insertPercyDom').and.returnValue(Promise.resolve()),
      snapshot: jasmine.createSpy('snapshot').and.returnValue(Promise.resolve({
        dom: '<html>test</html>',
        domSnapshot: '<html>test</html>'
      }))
    };

    percy = createPercyMock({
      minHeight: 1024,
      widths: [768, 1024]
    });

    log = {
      debug: jasmine.createSpy('debug'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error')
    };

    spyOn(utils, 'captureSerializedDOM').and.returnValue(
      Promise.resolve('<html>test</html>')
    );
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.PERCY_RESPONSIVE_CAPTURE_MIN_HEIGHT;
  });

  it('uses calculated height when PERCY_RESPONSIVE_CAPTURE_MIN_HEIGHT is set', async () => {
    process.env.PERCY_RESPONSIVE_CAPTURE_MIN_HEIGHT = 'true';

    const options = { widths: [768] };
    const story = { id: 'test-story', url: 'http://localhost:6006/iframe.html?id=test' };
    await utils.captureResponsiveDOM(page, options, percy, log, story);

    // Should calculate: outerHeight(800) - currentHeight(667) + configMinHeight(1024) = 1157
    expect(log.debug).toHaveBeenCalledWith('Using custom minHeight for responsive capture: 1157');
    expect(page.resize).toHaveBeenCalledWith({
      width: 768,
      height: 1157,
      deviceScaleFactor: 1,
      mobile: false
    });
  });

  it('uses current height when PERCY_RESPONSIVE_CAPTURE_MIN_HEIGHT is not set', async () => {
    const options = { widths: [768] };
    const story = { id: 'test-story', url: 'http://localhost:6006/iframe.html?id=test' };
    await utils.captureResponsiveDOM(page, options, percy, log, story);

    // Should use currentHeight (667) as default
    expect(page.resize).toHaveBeenCalledWith({
      width: 768,
      height: 667,
      deviceScaleFactor: 1,
      mobile: false
    });
  });

  it('uses configMinHeight fallback when config.snapshot.minHeight is not set', async () => {
    process.env.PERCY_RESPONSIVE_CAPTURE_MIN_HEIGHT = 'true';
    percy.config.snapshot.minHeight = undefined;

    const options = { widths: [768] };
    const story = { id: 'test-story', url: 'http://localhost:6006/iframe.html?id=test' };
    await utils.captureResponsiveDOM(page, options, percy, log, story);

    // Should calculate: outerHeight(800) - currentHeight(667) + fallback(1024) = 1157
    expect(log.debug).toHaveBeenCalledWith('Using custom minHeight for responsive capture: 1157');
    expect(page.resize).toHaveBeenCalledWith({
      width: 768,
      height: 1157,
      deviceScaleFactor: 1,
      mobile: false
    });
  });

  it('properly combines mobile and desktop widths with calculated heights', async () => {
    process.env.PERCY_RESPONSIVE_CAPTURE_MIN_HEIGHT = 'true';

    const options = { widths: [375, 768] }; // 375 is mobile AND desktop (desktop wins!)
    const story = { id: 'test-story', url: 'http://localhost:6006/iframe.html?id=test' };
    await utils.captureResponsiveDOM(page, options, percy, log, story);

    // All widths: 375(mobile), 414(mobile), 768(desktop), 375(desktop override)
    // 414 mobile-only gets mobile height
    expect(page.resize).toHaveBeenCalledWith({
      width: 414,
      height: 896, // Mobile height from API
      deviceScaleFactor: 1,
      mobile: false
    });

    // 768 desktop gets calculated height
    expect(page.resize).toHaveBeenCalledWith({
      width: 768,
      height: 1157, // Calculated height: 800 - 667 + 1024
      deviceScaleFactor: 1,
      mobile: false
    });

    // 375 desktop override (user provided) - now correctly uses calculated height
    expect(page.resize).toHaveBeenCalledWith({
      width: 375,
      height: 1157, // Should be calculated height (desktop preference wins over mobile): 800-667+1024=1157
      deviceScaleFactor: 1,
      mobile: false
    });

    // Clean up
    delete process.env.PERCY_RESPONSIVE_CAPTURE_MIN_HEIGHT;
  });
});

describe('captureResponsiveDOM story state restoration', () => {
  let page, percy, log;

  beforeEach(() => {
    page = {
      eval: jasmine.createSpy('eval').and.callFake(async (fn, args) => {
        if (fn.toString().includes('window.innerWidth')) {
          return { width: 375, height: 667 };
        } else if (fn.toString().includes('window.resizeCount')) {
          return undefined;
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

    percy = createPercyMock();

    log = {
      debug: jasmine.createSpy('debug'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error')
    };

    spyOn(utils, 'captureSerializedDOM').and.returnValue(
      Promise.resolve('<html>test</html>')
    );
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.PERCY_RESPONSIVE_CAPTURE_RELOAD_PAGE;
  });

  it('reloads page and re-applies story state when PERCY_RESPONSIVE_CAPTURE_RELOAD_PAGE is set', async () => {
    process.env.PERCY_RESPONSIVE_CAPTURE_RELOAD_PAGE = 'true';

    const story = {
      id: 'test-story',
      url: 'http://localhost:6006/iframe.html?id=test-story',
      args: { color: 'red' },
      globals: { theme: 'dark' },
      queryParams: { viewMode: 'story' }
    };

    const options = { widths: [768] };

    await utils.captureResponsiveDOM(page, options, percy, log, story);

    // Should reload the page with the story URL (viewMode=story is automatically added)
    expect(log.debug).toHaveBeenCalledWith('Reloading page for responsive capture');
    expect(page.goto).toHaveBeenCalledWith('http://localhost:6006/iframe.html?id=test-story&viewMode=story', { forceReload: true });

    // Should re-apply story state after reload
    expect(log.debug).toHaveBeenCalledWith('Re-applying story state after reload');
    expect(page.eval).toHaveBeenCalledWith(jasmine.any(Function), story);
  });

  it('adds viewMode=story to URL if not present when reloading', async () => {
    process.env.PERCY_RESPONSIVE_CAPTURE_RELOAD_PAGE = 'true';

    const story = {
      id: 'test-story',
      url: 'http://localhost:6006/iframe.html?id=test-story',
      args: { color: 'red' },
      globals: { theme: 'dark' }
    };

    const options = { widths: [768] };

    await utils.captureResponsiveDOM(page, options, percy, log, story);

    // Should add viewMode=story to the URL
    expect(page.goto).toHaveBeenCalledWith('http://localhost:6006/iframe.html?id=test-story&viewMode=story', { forceReload: true });
  });

  it('preserves existing viewMode in URL when reloading', async () => {
    process.env.PERCY_RESPONSIVE_CAPTURE_RELOAD_PAGE = 'true';

    const story = {
      id: 'test-story',
      url: 'http://localhost:6006/iframe.html?id=test-story&viewMode=docs',
      args: { color: 'red' },
      globals: { theme: 'dark' }
    };

    const options = { widths: [768] };

    await utils.captureResponsiveDOM(page, options, percy, log, story);

    // Should preserve existing viewMode
    expect(page.goto).toHaveBeenCalledWith('http://localhost:6006/iframe.html?id=test-story&viewMode=docs', { forceReload: true });
  });

  it('does not reload page when PERCY_RESPONSIVE_CAPTURE_RELOAD_PAGE is not set', async () => {
    const story = {
      id: 'test-story',
      url: 'http://localhost:6006/iframe.html?id=test-story',
      args: { color: 'red' },
      globals: { theme: 'dark' }
    };

    const options = { widths: [768] };

    await utils.captureResponsiveDOM(page, options, percy, log, story);

    // Should not reload the page
    expect(page.goto).not.toHaveBeenCalled();
    expect(log.debug).not.toHaveBeenCalledWith('Reloading page for responsive capture');
    expect(log.debug).not.toHaveBeenCalledWith('Re-applying story state after reload');
  });

  it('handles story with complex URL parameters correctly', async () => {
    process.env.PERCY_RESPONSIVE_CAPTURE_RELOAD_PAGE = 'true';

    const story = {
      id: 'test-story',
      url: 'http://localhost:6006/iframe.html?id=test-story&args=color:red&globals=theme:dark',
      args: { color: 'red' },
      globals: { theme: 'dark' }
    };

    const options = { widths: [768] };

    await utils.captureResponsiveDOM(page, options, percy, log, story);

    // Should preserve all existing parameters and add viewMode (URL encoding is handled by URL constructor)
    expect(page.goto).toHaveBeenCalledWith('http://localhost:6006/iframe.html?id=test-story&args=color%3Ared&globals=theme%3Adark&viewMode=story', { forceReload: true });
  });

  it('calls evalSetCurrentStory with the complete story object after reload', async () => {
    process.env.PERCY_RESPONSIVE_CAPTURE_RELOAD_PAGE = 'true';

    const story = {
      id: 'test-story',
      url: 'http://localhost:6006/iframe.html?id=test-story',
      args: { color: 'red', size: 'large' },
      globals: { theme: 'dark', locale: 'en' },
      queryParams: { viewMode: 'story' }
    };

    const options = { widths: [768] };

    await utils.captureResponsiveDOM(page, options, percy, log, story);

    // Should call eval with evalSetCurrentStory function and the complete story object
    expect(page.eval).toHaveBeenCalledWith(jasmine.any(Function), story);

    // Verify the function passed is evalSetCurrentStory by checking its string representation
    const evalCall = page.eval.calls.all().find(call => call.args[1] === story);
    expect(evalCall).toBeDefined();
    expect(evalCall.args[0].toString()).toContain('evalSetCurrentStory');
  });
});

describe('evalStorybookStorySnapshots', () => {
  const waitFor = fn => Promise.resolve(fn());
  const storiesObj = {
    'story--one': { id: 'story--one', kind: 'Foo', name: 'Bar', parameters: { percy: {} } }
  };
  const entries = {
    'docs--one': { id: 'docs--one', type: 'docs', tags: [] },
    'autodoc--one': { id: 'autodoc--one', type: 'docs', tags: ['autodocs'] }
  };
  global.window = {
    __STORYBOOK_PREVIEW__: {
      ready: () => Promise.resolve(),
      extract: () => storiesObj,
      storyStoreValue: { storyIndex: { entries } }
    }
  };

  it('includes story, docs, and autodoc when both flags are true', async () => {
    const { data } = await utils.evalStorybookStorySnapshots(
      { waitFor }, { docCapture: true, autodocCapture: true }
    );
    const ids = data.map(s => s.id);
    expect(ids).toContain('story--one');
    expect(ids).toContain('docs--one');
    expect(ids).toContain('autodoc--one');
    expect(data.length).toBe(3);
  });

  it('includes only story and docs when docCapture=true, autodocCapture=false', async () => {
    const { data } = await utils.evalStorybookStorySnapshots(
      { waitFor }, { docCapture: true, autodocCapture: false }
    );
    const ids = data.map(s => s.id);
    expect(ids).toContain('story--one');
    expect(ids).toContain('docs--one');
    expect(ids).not.toContain('autodoc--one');
    expect(data.length).toBe(2);
  });

  it('includes only story and autodoc when docCapture=false, autodocCapture=true', async () => {
    const { data } = await utils.evalStorybookStorySnapshots(
      { waitFor }, { docCapture: false, autodocCapture: true }
    );
    const ids = data.map(s => s.id);
    expect(ids).toContain('story--one');
    expect(ids).toContain('autodoc--one');
    expect(ids).not.toContain('docs--one');
    expect(data.length).toBe(2);
  });

  it('includes only story when both flags are false', async () => {
    const { data } = await utils.evalStorybookStorySnapshots(
      { waitFor }, { docCapture: false, autodocCapture: false }
    );
    const ids = data.map(s => s.id);
    expect(ids).toContain('story--one');
    expect(ids).not.toContain('docs--one');
    expect(ids).not.toContain('autodoc--one');
    expect(data.length).toBe(1);
  });

  it('handles missing entries object gracefully (no errors, only story returned)', async () => {
    // Remove the entries property
    delete global.window.__STORYBOOK_PREVIEW__.storyStoreValue.storyIndex.entries;
    const { data } = await utils.evalStorybookStorySnapshots(
      { waitFor }, { docCapture: true, autodocCapture: true }
    );
    const ids = data.map(s => s.id);
    expect(ids).toContain('story--one');
    expect(ids).not.toContain('docs--one');
    expect(ids).not.toContain('autodoc--one');
    expect(data.length).toBe(1);
  });
});

describe('evalSetCurrentStory event handling', () => {
  let channel, waitFor, story;

  function patchNoLoaders() {
    global.document = {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      body: { classList: { contains: () => false, toString: () => '' } }
    };
    global.window.getComputedStyle = () => ({ display: 'none', visibility: 'visible', opacity: '1' });
  }

  beforeEach(() => {
    const listeners = {};
    channel = {
      on: (event, cb) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(cb);
      },
      emit: (event, payload) => {
        if (listeners[event]) listeners[event].forEach(cb => cb(payload));
      }
    };
    waitFor = fn => Promise.resolve(fn());
    story = { id: 'story--one', args: {}, globals: {}, queryParams: {} };
    global.window = {
      __STORYBOOK_PREVIEW__: { channel },
      __STORYBOOK_STORY_STORE__: { _channel: channel }
    };
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.window?.getComputedStyle;
  });

  it('resolves when docsRendered event is emitted', async () => {
    patchNoLoaders();
    const testStory = { id: 'test-story', url: 'http://localhost:6006/iframe.html?id=test' };
    const promise = utils.evalSetCurrentStory({ waitFor }, testStory);
    setTimeout(() => channel.emit('docsRendered'), 0);
    await expectAsync(promise).toBeResolved();
  });
});
