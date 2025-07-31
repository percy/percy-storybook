import * as utils from '../src/utils.js';
import { captureDOM } from '../src/snapshots.js';

const mockCaptureSerializedDOM = jasmine.createSpy('captureSerializedDOM').and.returnValue(
  Promise.resolve({ domSnapshot: { html: '<html>SINGLE</html>' } })
);

const mockCaptureResponsiveDOM = jasmine.createSpy('captureResponsiveDOM').and.callFake((page, widths) => {
  return Promise.resolve(widths.map(width => ({
    domSnapshot: { html: `<html>RESP for ${width}</html>`, width }
  })));
});

const mockGetWidthsForResponsiveCapture = jasmine.createSpy('getWidthsForResponsiveCapture').and.callFake((input, extras) => {
  if (Array.isArray(input)) return input;
  return [111, 222];
});

// Mock utility functions before tests
beforeAll(() => {
  spyOn(utils, 'captureSerializedDOM').and.returnValue(mockCaptureSerializedDOM);
  spyOn(utils, 'captureResponsiveDOM').and.returnValue(mockCaptureResponsiveDOM);
  spyOn(utils, 'getWidthsForResponsiveCapture').and.returnValue(mockGetWidthsForResponsiveCapture);
});

describe('captureDOM behavior', () => {
  let page, percy, log, previewResource;

  beforeEach(() => {
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

    // Reset spies on each test
    mockCaptureSerializedDOM.calls.reset();
    mockCaptureResponsiveDOM.calls.reset();
    mockGetWidthsForResponsiveCapture.calls.reset();
  });

  it('shows multiple snapshots when the responsive feature is turned on by options', async () => {
    percy.config.snapshot.responsiveSnapshotCapture = false;
    const options = {
      widths: [500, 600],
      responsiveSnapshotCapture: true,
      domSnapshot: previewResource.content
    };

    const result = await captureDOM(page, options, percy, log);

    expect(mockCaptureResponsiveDOM).toHaveBeenCalled();
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

    expect(mockCaptureSerializedDOM).toHaveBeenCalled();
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

    expect(mockCaptureResponsiveDOM).toHaveBeenCalled();
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

    expect(mockCaptureSerializedDOM).toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(false);
    expect(result.domSnapshot.html).toBe('<html>SINGLE</html>');
  });
});
