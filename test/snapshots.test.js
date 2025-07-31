import * as utils from '../src/utils.js';
import { captureDOM } from '../src/snapshots.js';

describe('captureDOM behavior', () => {
  let page, percy, log, previewResource;

  beforeEach(() => {
    page = {
      eval: jasmine.createSpy('eval'),
      snapshot: jasmine.createSpy('snapshot').and.returnValue(
        Promise.resolve({ domSnapshot: '<html>SINGLE</html>' })
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

    spyOn(utils, 'captureResponsiveDOM').and.returnValue(
      Promise.resolve([
        { domSnapshot: '<html>RESP1</html>', width: 500 },
        { domSnapshot: '<html>RESP2</html>', width: 600 }
      ])
    );
    spyOn(utils, 'captureSerializedDOM').and.returnValue(
      Promise.resolve({ domSnapshot: '<html>SINGLE</html>' })
    );
    spyOn(utils, 'getWidthsForResponsiveCapture').and.callThrough();
  });

  it('shows multiple snapshots when the responsive feature is turned on by options', async () => {
    percy.config.snapshot.responsiveSnapshotCapture = false;
    const options = {
      widths: [500],
      responsiveSnapshotCapture: true,
      domSnapshot: previewResource.content
    };

    const result = await captureDOM(page, options, percy, log);

    expect(utils.captureResponsiveDOM).toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].domSnapshot).toBe('<html>RESP1</html>');
    expect(result[0].width).toBe(500);
    expect(result.length).toBe(2);
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
    expect(result.domSnapshot).toBe('<html>SINGLE</html>');
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
    expect(result[0].domSnapshot).toBe('<html>RESP1</html>');
    expect(result[0].width).toBe(500);
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
    expect(result.domSnapshot).toBe('<html>SINGLE</html>');
  });

  it('combines device widths with default widths before taking responsive snapshots', async () => {
    percy.config.snapshot.responsiveSnapshotCapture = true;
    const options = { widths: [100], domSnapshot: previewResource.content };

    spyOn(utils, 'getWidthsForResponsiveCapture').and.returnValue([111, 222]);

    await captureDOM(page, options, percy, log);

    expect(percy.client.getDeviceDetails).toHaveBeenCalledWith('buildid');
    expect(utils.getWidthsForResponsiveCapture).toHaveBeenCalledWith(
      [100],
      { mobile: [320, 375], config: [800] }
    );
    expect(utils.captureResponsiveDOM).toHaveBeenCalledWith(
      page,
      jasmine.objectContaining({ widths: [111, 222] }),
      percy,
      log
    );
  });

  it('uses only default widths before taking a single snapshot when responsiveness is off', async () => {
    percy.config.snapshot.responsiveSnapshotCapture = false;
    const options = { widths: [200], domSnapshot: previewResource.content };

    spyOn(utils, 'getWidthsForResponsiveCapture').and.returnValue([808]);

    await captureDOM(page, options, percy, log);

    expect(utils.getWidthsForResponsiveCapture).toHaveBeenCalledWith(
      [200],
      { config: [800] }
    );
    expect(utils.captureSerializedDOM).toHaveBeenCalledWith(
      page,
      jasmine.objectContaining({ widths: [808] }),
      log
    );
  });
});
