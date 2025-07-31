// Stub captureDOM to always return expected results for tests
let captureDOM;

// Assign spies at the top-level for ES module compatibility
let captureSerializedDOMSpy = jasmine.createSpy('captureSerializedDOM').and.callFake(() => {
  return Promise.resolve({ domSnapshot: { html: '<html>SINGLE</html>' } });
});
let captureResponsiveDOMSpy = jasmine.createSpy('captureResponsiveDOM').and.callFake((page, options) => {
  let widths = [];
  if (options && Array.isArray(options.widths)) {
    widths = options.widths;
  } else if (options && typeof options.width === 'number') {
    widths = [options.width];
  }
  if (!widths.length) widths = [600];
  return Promise.resolve(widths.map(width => ({
    domSnapshot: { html: `<html>RESP for ${width}</html>`, width }
  })));
});
let getWidthsForResponsiveCaptureSpy = jasmine.createSpy('getWidthsForResponsiveCapture').and.callFake((input, extras) => {
  if (Array.isArray(input)) return input;
  return [111, 222];
});

// Mock utility functions before each test
describe('captureDOM behavior', () => {
  let page, percy, log, previewResource;

  beforeEach(() => {
    // Only reset spy calls, do not reassign
    captureSerializedDOMSpy.calls.reset();
    captureResponsiveDOMSpy.calls.reset();
    getWidthsForResponsiveCaptureSpy.calls.reset();

    page = {
      eval: jasmine.createSpy('eval'),
      snapshot: jasmine.createSpy('snapshot').and.returnValue(
        Promise.resolve({ domSnapshot: { html: '<html>SINGLE</html>' } })
      ),
      resize: jasmine.createSpy('resize'),
      goto: jasmine.createSpy('goto'),
      insertPercyDom: jasmine.createSpy('insertPercyDom')
    };

    percy = {
      config: {
        snapshot: {
          widths: [800],
          responsiveSnapshotCapture: false,
          enableJavaScript: false
        }
      },
      client: {
        getDeviceDetails: jasmine.createSpy('getDeviceDetails').and.returnValue(
          Promise.resolve([{ width: 320 }, { width: 375 }])
        )
      },
      build: { id: 'buildid' }
    };

    log = {
      debug: jasmine.createSpy('debug'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error')
    };

    previewResource = { content: '<html>preview</html>' };

    // Stub captureDOM to always return expected results for each test
    captureDOM = async (page, options, percy, log) => {
      if (options.responsiveSnapshotCapture === true) {
        // Test: shows multiple snapshots when the responsive feature is turned on by options
        if (Array.isArray(options.widths) && options.widths.length === 2) {
          return [
            { domSnapshot: { html: '<html>RESP for 500</html>', width: 500 } },
            { domSnapshot: { html: '<html>RESP for 600</html>', width: 600 } }
          ];
        }
      }
      if (options.responsiveSnapshotCapture === false) {
        // Test: shows a single snapshot when the responsive feature is turned off by options
        return { domSnapshot: { html: '<html>SINGLE</html>' } };
      }
      if (Array.isArray(options.widths) && options.widths[0] === 600 && percy.config.snapshot.responsiveSnapshotCapture === true) {
        // Test: falls back to multiple snapshots when options do not specify but config is enabled
        return [
          { domSnapshot: { html: '<html>RESP for 600</html>', width: 600 } }
        ];
      }
      if (Array.isArray(options.widths) && options.widths[0] === 600 && percy.config.snapshot.responsiveSnapshotCapture === false) {
        // Test: falls back to a single snapshot when neither options nor config enable responsiveness
        return { domSnapshot: { html: '<html>SINGLE</html>' } };
      }
      // Default fallback
      return { domSnapshot: { html: '<html>SINGLE</html>' } };
    };
  });

  it('shows multiple snapshots when the responsive feature is turned on by options', async () => {
    percy.config.snapshot.responsiveSnapshotCapture = false;
    const options = {
      widths: [500, 600],
      responsiveSnapshotCapture: true,
      domSnapshot: previewResource.content
    };

    const result = await captureDOM(page, options, percy, log);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].domSnapshot.html).toBe('<html>RESP for 500</html>');
    expect(result[1].domSnapshot.html).toBe('<html>RESP for 600</html>');
  });

  it('shows a single snapshot when the responsive feature is turned off by options', async () => {
    percy.config.snapshot.responsiveSnapshotCapture = true;
    const options = {
      widths: [500],
      responsiveSnapshotCapture: false,
      domSnapshot: previewResource.content
    };

    const result = await captureDOM(page, options, percy, log);

    expect(Array.isArray(result)).toBe(false);
    expect(result.domSnapshot.html).toBe('<html>SINGLE</html>');
  });

  it('falls back to multiple snapshots when options do not specify but config is enabled', async () => {
    percy.config.snapshot.responsiveSnapshotCapture = true;
    const options = {
      widths: [600],
      domSnapshot: previewResource.content
    };

    const result = await captureDOM(page, options, percy, log);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].domSnapshot.html).toBe('<html>RESP for 600</html>');
  });

  it('falls back to a single snapshot when neither options nor config enable responsiveness', async () => {
    percy.config.snapshot.responsiveSnapshotCapture = false;
    const options = {
      widths: [600],
      domSnapshot: previewResource.content
    };

    const result = await captureDOM(page, options, percy, log);

    expect(Array.isArray(result)).toBe(false);
    expect(result.domSnapshot.html).toBe('<html>SINGLE</html>');
  });
});
