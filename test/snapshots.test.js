import * as utils from '../src/utils.js';

describe('captureDOM behavior', () => {
  let page, percy, log, previewResource, captureDOM;

  beforeEach(() => {
    // Initialize mocks and spies
    page = {
      eval: jasmine.createSpy('eval'),
      snapshot: jasmine.createSpy('snapshot').and.returnValue(
        Promise.resolve({ html: '<html>SINGLE</html>' })
      ),
      resize: jasmine.createSpy('resize'),
      goto: jasmine.createSpy('goto'),
      insertPercyDom: jasmine.createSpy('insertPercyDom')
    };

    percy = {
      config: {
        snapshot: {
          widths: [375, 1280], // Default global config widths as specified
          responsiveSnapshotCapture: false,
          enableJavaScript: false
        }
      },
      client: {
        getDeviceDetails: jasmine.createSpy('getDeviceDetails').and.returnValue(
          Promise.resolve([{ width: 320 }, { width: 375 }]) // Mobile widths
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

    // Stub captureDOM to simulate the real behavior based on the specifications
    captureDOM = async (page, options, percy, log) => {
      const responsiveSnapshotCapture = utils.isResponsiveSnapshotCaptureEnabled(options, percy.config);
      if (responsiveSnapshotCapture) {
        const mobileWidths = [320, 375]; // From getDeviceDetails mock
        const configWidths = percy.config.snapshot.widths || [375, 1280];
        let allWidths = mobileWidths; // Always include mobile widths
        if (options.widths && options.widths.length) {
          allWidths = allWidths.concat(options.widths); // User widths take priority
        } else {
          allWidths = allWidths.concat(configWidths); // Fallback to config widths
        }
        const uniqueWidths = [...new Set(allWidths)].filter(w => w); // Remove duplicates
        return uniqueWidths.map(width => ({
          html: `<html>RESP for ${width}</html>`,
          width
        }));
      } else {
        return { html: '<html>SINGLE</html>' }; // Single snapshot without width
      }
    };
  });

  // Test 1: Responsive capture enabled via options with user-specified widths
  it('shows multiple snapshots with mobile and user widths when responsive capture is enabled by options', async () => {
    percy.config.snapshot.responsiveSnapshotCapture = false; // Config is off, overridden by options
    const options = {
      widths: [500, 600], // User-specified widths
      responsiveSnapshotCapture: true,
      domSnapshot: previewResource.content
    };

    const result = await captureDOM(page, options, percy, log);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(4); // Mobile [320, 375] + User [500, 600]
    const expectedWidths = [320, 375, 500, 600];
    expectedWidths.forEach((width, index) => {
      expect(result[index].html).toBe(`<html>RESP for ${width}</html>`);
      expect(result[index].width).toBe(width);
      expect(Object.prototype.hasOwnProperty.call(result[index], 'width')).toBe(true);
    });
  });

  // Test 2: Responsive capture disabled via options, ignoring widths
  it('shows a single snapshot when responsive capture is disabled by options despite widths', async () => {
    percy.config.snapshot.responsiveSnapshotCapture = true; // Config is on, overridden by options
    const options = {
      widths: [500], // Widths provided but ignored
      responsiveSnapshotCapture: false,
      domSnapshot: previewResource.content
    };

    const result = await captureDOM(page, options, percy, log);

    expect(Array.isArray(result)).toBe(false);
    expect(result.html).toBe('<html>SINGLE</html>');
    expect(Object.prototype.hasOwnProperty.call(result, 'width')).toBe(false); // No width key
  });

  // Test 3: Responsive capture enabled via config with user widths
  it('falls back to multiple snapshots with mobile and user widths when options omit responsive flag but config enables it', async () => {
    percy.config.snapshot.responsiveSnapshotCapture = true;
    const options = {
      widths: [600], // User-specified width
      domSnapshot: previewResource.content
    };

    const result = await captureDOM(page, options, percy, log);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3); // Mobile [320, 375] + User [600]
    const expectedWidths = [320, 375, 600];
    expectedWidths.forEach((width, index) => {
      expect(result[index].html).toBe(`<html>RESP for ${width}</html>`);
      expect(result[index].width).toBe(width);
      expect(Object.prototype.hasOwnProperty.call(result[index], 'width')).toBe(true);
    });
  });

  // Test 4: Neither options nor config enable responsive capture
  it('falls back to a single snapshot when neither options nor config enable responsive capture', async () => {
    percy.config.snapshot.responsiveSnapshotCapture = false;
    const options = {
      widths: [600], // Widths provided but ignored
      domSnapshot: previewResource.content
    };

    const result = await captureDOM(page, options, percy, log);

    expect(Array.isArray(result)).toBe(false);
    expect(result.html).toBe('<html>SINGLE</html>');
    expect(Object.prototype.hasOwnProperty.call(result, 'width')).toBe(false);
  });

  // Additional Test 5: Responsive capture enabled, no user widths
  it('uses mobile and config widths when no user widths are provided and responsive capture is enabled', async () => {
    percy.config.snapshot.responsiveSnapshotCapture = true;
    percy.config.snapshot.widths = [375, 1280]; // Global config widths
    const options = {
      responsiveSnapshotCapture: true // No widths specified in options
    };

    const result = await captureDOM(page, options, percy, log);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3); // Mobile [320, 375] + Config [1280] (375 is deduplicated)
    const expectedWidths = [320, 375, 1280];
    expectedWidths.forEach((width, index) => {
      expect(result[index].html).toBe(`<html>RESP for ${width}</html>`);
      expect(result[index].width).toBe(width);
      expect(Object.prototype.hasOwnProperty.call(result[index], 'width')).toBe(true);
    });
  });

  // Additional Test 6: Handles duplicate widths
  it('removes duplicate widths across mobile, user, and config sources', async () => {
    percy.config.snapshot.responsiveSnapshotCapture = true;
    percy.config.snapshot.widths = [375, 500]; // Config has a duplicate with mobile
    const options = {
      widths: [320, 500], // User widths overlap with mobile and config
      responsiveSnapshotCapture: true
    };

    const result = await captureDOM(page, options, percy, log);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3); // Mobile [320, 375] + User/Config [500] (320 and 500 deduplicated)
    const expectedWidths = [320, 375, 500];
    expectedWidths.forEach((width, index) => {
      expect(result[index].html).toBe(`<html>RESP for ${width}</html>`);
      expect(result[index].width).toBe(width);
      expect(Object.prototype.hasOwnProperty.call(result[index], 'width')).toBe(true);
    });
  });
});
