import * as utils from '../src/utils.js';
import { captureDOM } from '../src/snapshots.js';

// Mock utility functions before each test
describe('captureDOM behavior', () => {
  let page, percy, log, previewResource;

  beforeEach(() => {
    // Remove any previous spies to avoid conflicts
    if (utils.captureSerializedDOM && utils.captureSerializedDOM.calls) {
      utils.captureSerializedDOM.calls.reset();
    }
    if (utils.captureResponsiveDOM && utils.captureResponsiveDOM.calls) {
      utils.captureResponsiveDOM.calls.reset();
    }
    if (utils.getWidthsForResponsiveCapture && utils.getWidthsForResponsiveCapture.calls) {
      utils.getWidthsForResponsiveCapture.calls.reset();
    }

    spyOn(utils, 'captureSerializedDOM').and.callFake(() => {
      return Promise.resolve({ domSnapshot: { html: '<html>SINGLE</html>' } });
    });
    spyOn(utils, 'captureResponsiveDOM').and.callFake((page, options) => {
      let widths = [];
      if (options && Array.isArray(options.widths)) {
        widths = options.widths;
      } else if (options && typeof options.width === 'number') {
        widths = [options.width];
      }
      // Always return at least one item for test stability
      if (!widths.length) widths = [600];
      return Promise.resolve(widths.map(width => ({
        domSnapshot: { html: `<html>RESP for ${width}</html>`, width }
      })));
    });
    spyOn(utils, 'getWidthsForResponsiveCapture').and.callFake((input, extras) => {
      if (Array.isArray(input)) return input;
      return [111, 222];
    });

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
  });

  it('shows multiple snapshots when the responsive feature is turned on by options', async () => {
    percy.config.snapshot.responsiveSnapshotCapture = false;
    const options = {
      widths: [500, 600],
      responsiveSnapshotCapture: true,
      domSnapshot: previewResource.content
    };

    const result = await captureDOM(page, options, percy, log);

    expect(utils.captureResponsiveDOM).toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].domSnapshot.html).toBe('<html>RESP for 500</html>');
    expect(result[0].domSnapshot.width).toBe(500);
    expect(result[1].domSnapshot.html).toBe('<html>RESP for 600</html>');
    expect(result[1].domSnapshot.width).toBe(600);
  });

  it('shows a single snapshot when the responsive feature is turned off by options', async () => {
    percy.config.snapshot.responsiveSnapshotCapture = true;
    const options = {
      widths: [500],
      responsiveSnapshotCapture: false,
      domSnapshot: previewResource.content
    };

    const result = await captureDOM(page, options, percy, log);

    expect(utils.captureSerializedDOM).toHaveBeenCalled();
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

    expect(utils.captureResponsiveDOM).toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].domSnapshot.html).toBe('<html>RESP for 600</html>');
    expect(result[0].domSnapshot.width).toBe(600);
  });

  it('falls back to a single snapshot when neither options nor config enable responsiveness', async () => {
    percy.config.snapshot.responsiveSnapshotCapture = false;
    const options = {
      widths: [600],
      domSnapshot: previewResource.content
    };

    const result = await captureDOM(page, options, percy, log);

    expect(utils.captureSerializedDOM).toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(false);
    expect(result.domSnapshot.html).toBe('<html>SINGLE</html>');
  });
});
