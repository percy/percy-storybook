import { captureDOM } from '../src/snapshots.js';

describe('captureDOM', () => {
  let page, percy, log, previewResource;

  beforeEach(() => {
    page = {
      eval: jasmine.createSpy('eval'),
      snapshot: jasmine.createSpy('snapshot'),
      goto: jasmine.createSpy('goto'),
      insertPercyDom: jasmine.createSpy('insertPercyDom'),
      resize: jasmine.createSpy('resize')
    };
    percy = {
      config: {
        snapshot: {
          enableJavaScript: false,
          widths: [800],
          responsiveSnapshotCapture: false
        }
      },
      client: {
        getDeviceDetails: jasmine
          .createSpy('getDeviceDetails')
          .and.returnValue(Promise.resolve([{ width: 800 }]))
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

  describe('enableJavaScript and responsiveSnapshotCapture combinations', () => {
    beforeEach(() => {
      page.eval.and.returnValue(Promise.resolve());
      page.snapshot.and.returnValue(Promise.resolve({ domSnapshot: '<html>combo</html>' }));
    });

    const combos = [
      { enableJavaScript: true, responsiveSnapshotCapture: true },
      { enableJavaScript: true, responsiveSnapshotCapture: false },
      { enableJavaScript: false, responsiveSnapshotCapture: true },
      { enableJavaScript: false, responsiveSnapshotCapture: false }
    ];

    combos.forEach(({ enableJavaScript, responsiveSnapshotCapture }) => {
      it(`returns correct result for enableJavaScript=${enableJavaScript}, responsiveSnapshotCapture=${responsiveSnapshotCapture}`, async () => {
        // Arrange
        percy.config.snapshot.enableJavaScript = enableJavaScript;
        percy.config.snapshot.responsiveSnapshotCapture = responsiveSnapshotCapture;
        const options = {
          name: 'story',
          widths: [375, 800],
          responsiveSnapshotCapture,
          domSnapshot: previewResource.content
        };

        // Act
        const result = await captureDOM(page, options, percy, log);

        // Assert
        if (responsiveSnapshotCapture) {
          expect(Array.isArray(result)).toBe(true);
          expect(result.length).toBeGreaterThan(0);
          expect(result[0].domSnapshot || result[0]).toBe('<html>combo</html>');
        } else {
          expect(result.domSnapshot || result).toBe('<html>combo</html>');
        }
      });
    });
  });

  it('delegates to responsive logic when responsiveSnapshotCapture is true', async () => {
    page.eval.and.returnValue(Promise.resolve());
    page.snapshot.and.returnValue(Promise.resolve({ domSnapshot: '<html>responsive</html>' }));
    percy.config.snapshot.responsiveSnapshotCapture = true;

    const options = {
      name: 'story',
      widths: [375, 800],
      responsiveSnapshotCapture: true,
      domSnapshot: previewResource.content
    };

    const result = await captureDOM(page, options, percy, log);

    expect(Array.isArray(result)).toBe(true);
    expect(result[0].domSnapshot || result[0]).toBe('<html>responsive</html>');
  });

  it('delegates to non-responsive logic when responsiveSnapshotCapture is false', async () => {
    page.eval.and.returnValue(Promise.resolve());
    page.snapshot.and.returnValue(Promise.resolve({ domSnapshot: '<html>nonresponsive</html>' }));
    percy.config.snapshot.responsiveSnapshotCapture = false;

    const options = {
      name: 'story',
      widths: [800],
      responsiveSnapshotCapture: false,
      domSnapshot: previewResource.content
    };

    const result = await captureDOM(page, options, percy, log);

    expect(result.domSnapshot || result).toBe('<html>nonresponsive</html>');
  });

  it('calls page.eval and page.snapshot for non-dryRun (non-responsive)', async () => {
    page.eval.and.returnValue(Promise.resolve());
    page.snapshot.and.returnValue(Promise.resolve({ domSnapshot: '<html>real</html>' }));
    percy.config.snapshot.responsiveSnapshotCapture = false;

    const options = {
      name: 'story',
      widths: [800],
      responsiveSnapshotCapture: false,
      domSnapshot: previewResource.content
    };

    const result = await captureDOM(page, options, percy, log);

    // Since captureSerializedDOM returns the raw object, we check its domSnapshot
    expect(result.domSnapshot || result).toBe('<html>real</html>');
  });
});
