import { captureDOM } from '../src/snapshots.js';

describe('captureDOM function', () => {
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

  describe('Different JavaScript and responsiveness settings', () => {
    beforeEach(() => {
      page.eval.and.returnValue(Promise.resolve());
      page.snapshot.and.returnValue(Promise.resolve({ domSnapshot: '<html>combo</html>' }));
    });

    const scenarios = [
      { js: true, responsive: true },
      { js: true, responsive: false },
      { js: false, responsive: true },
      { js: false, responsive: false }
    ];

    scenarios.forEach(({ js, responsive }) => {
      it(`produces the right snapshot when JavaScript is ${js ? 'on' : 'off'} and responsive is ${responsive ? 'on' : 'off'}`, async () => {
        percy.config.snapshot.enableJavaScript = js;
        percy.config.snapshot.responsiveSnapshotCapture = responsive;
        const options = {
          name: 'story',
          widths: [375, 800],
          responsiveSnapshotCapture: responsive,
          domSnapshot: previewResource.content
        };

        const result = await captureDOM(page, options, percy, log);

        if (responsive) {
          // when responsive capture is enabled, we expect an array of snapshots
          expect(Array.isArray(result)).toBe(true);
          expect(result.length).toBeGreaterThan(0);
          expect(result[0].domSnapshot || result[0]).toBe('<html>combo</html>');
        } else {
          // when responsive capture is off, we expect a single snapshot
          expect(result.domSnapshot || result).toBe('<html>combo</html>');
        }
      });
    });
  });

  it('uses the responsive path when responsiveness is turned on', async () => {
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

  it('uses the simple path when responsiveness is turned off', async () => {
    page.eval.and.returnValue(Promise.resolve());
    page.snapshot.and.returnValue(Promise.resolve({ domSnapshot: '<html>plain</html>' }));
    percy.config.snapshot.responsiveSnapshotCapture = false;

    const options = {
      name: 'story',
      widths: [800],
      responsiveSnapshotCapture: false,
      domSnapshot: previewResource.content
    };

    const result = await captureDOM(page, options, percy, log);

    expect(result.domSnapshot || result).toBe('<html>plain</html>');
  });

  it('captures the live DOM when running normally', async () => {
    page.eval.and.returnValue(Promise.resolve());
    page.snapshot.and.returnValue(Promise.resolve({ domSnapshot: '<html>live</html>' }));
    percy.config.snapshot.responsiveSnapshotCapture = false;

    const options = {
      name: 'story',
      widths: [800],
      responsiveSnapshotCapture: false,
      domSnapshot: previewResource.content
    };

    const result = await captureDOM(page, options, percy, log);

    expect(result.domSnapshot || result).toBe('<html>live</html>');
  });
});
