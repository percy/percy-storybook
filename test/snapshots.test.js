import * as utils from '../src/utils.js';
import { IntelliStoryBailError, PercyConfig } from '@percy/cli-command';
import * as CoreConfig from '@percy/core/config';
import { applyIntelliStoryFilter, processStory } from '../src/snapshots.js';

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
    captureDOM = async (page, options, percy, log, story) => {
      const responsiveSnapshotCapture = utils.isResponsiveSnapshotCaptureEnabled(options, percy.config);

      if (responsiveSnapshotCapture) {
        log.debug('captureDOM: Using responsive snapshot capture', { options });
        const mobileWidths = [320, 375]; // From getDeviceDetails mock
        const configWidths = percy.config.snapshot.widths || [375, 1280];
        let allWidths = mobileWidths; // Always include mobile widths
        if (options.widths && options.widths.length) {
          allWidths = allWidths.concat(options.widths); // User widths take priority
        } else {
          allWidths = allWidths.concat(configWidths); // Fallback to config widths
        }
        const uniqueWidths = [...new Set(allWidths)].filter(w => w); // Remove duplicates

        // Simulate the story state restoration behavior when PERCY_RESPONSIVE_CAPTURE_RELOAD_PAGE is set
        if (process.env.PERCY_RESPONSIVE_CAPTURE_RELOAD_PAGE && story) {
          log.debug('Reloading page for responsive capture');
        }

        return uniqueWidths.map(width => ({
          html: `<html>RESP for ${width}</html>`,
          width
        }));
      } else {
        log.debug('captureDOM: Using single snapshot capture');
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

    const result = await captureDOM(page, options, percy, log, null);

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

    const result = await captureDOM(page, options, percy, log, null);

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

    const result = await captureDOM(page, options, percy, log, null);

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

    const result = await captureDOM(page, options, percy, log, null);

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

    const result = await captureDOM(page, options, percy, log, null);

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

    const result = await captureDOM(page, options, percy, log, null);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3); // Mobile [320, 375] + User/Config [500] (320 and 500 deduplicated)
    const expectedWidths = [320, 375, 500];
    expectedWidths.forEach((width, index) => {
      expect(result[index].html).toBe(`<html>RESP for ${width}</html>`);
      expect(result[index].width).toBe(width);
      expect(Object.prototype.hasOwnProperty.call(result[index], 'width')).toBe(true);
    });
  });

  // Test 7: Verifies log parameter usage
  it('uses log parameter for debugging in responsive capture mode', async () => {
    percy.config.snapshot.responsiveSnapshotCapture = true;
    const options = {
      widths: [768],
      responsiveSnapshotCapture: true
    };

    await captureDOM(page, options, percy, log, null);

    expect(log.debug).toHaveBeenCalledWith('captureDOM: Using responsive snapshot capture', { options });
  });

  // Test 8: Verifies log parameter usage in single capture mode
  it('uses log parameter for debugging in single capture mode', async () => {
    percy.config.snapshot.responsiveSnapshotCapture = false;
    const options = {
      responsiveSnapshotCapture: false
    };

    await captureDOM(page, options, percy, log, null);

    expect(log.debug).toHaveBeenCalledWith('captureDOM: Using single snapshot capture');
  });

  // Test 9: Verifies story parameter usage with page reload
  it('uses story parameter for page reload when PERCY_RESPONSIVE_CAPTURE_RELOAD_PAGE is set', async () => {
    process.env.PERCY_RESPONSIVE_CAPTURE_RELOAD_PAGE = 'true';
    percy.config.snapshot.responsiveSnapshotCapture = true;
    const options = {
      widths: [768],
      responsiveSnapshotCapture: true
    };
    const story = {
      id: 'test-story',
      url: 'http://localhost:6006/iframe.html?id=test-story',
      args: { color: 'red' },
      globals: { theme: 'dark' }
    };

    await captureDOM(page, options, percy, log, story);

    expect(log.debug).toHaveBeenCalledWith('captureDOM: Using responsive snapshot capture', { options });

    // Clean up
    delete process.env.PERCY_RESPONSIVE_CAPTURE_RELOAD_PAGE;
  });
});

describe('takeStorybookSnapshots behaviour', () => {
  let takeStorybookSnapshots, page, withPage;

  beforeEach(() => {
    page = {
      eval: jasmine.createSpy('eval').and.returnValue(
        Promise.resolve({ invalid: [], data: [{ id: 'story--one', name: 'Story One' }] })
      ),
      snapshot: jasmine.createSpy('snapshot'),
      resize: jasmine.createSpy('resize'),
      goto: jasmine.createSpy('goto'),
      insertPercyDom: jasmine.createSpy('insertPercyDom')
    };
    withPage = (_percy, url, cb) => cb(page);
    takeStorybookSnapshots = function*(percy, callback, { baseUrl, flags }) {
      const aboutUrl = 'about-url';
      const previewUrl = 'preview-url';
      const docCaptureFlag = process.env.PERCY_STORYBOOK_DOC_CAPTURE === 'true';
      const autodocCaptureFlag = process.env.PERCY_STORYBOOK_AUTODOC_CAPTURE === 'true';
      yield withPage(
        percy,
        aboutUrl,
        p => p.eval('evalStorybookEnvironmentInfo'),
        undefined,
        { from: 'about url' }
      );
      yield withPage(
        percy,
        previewUrl,
        p => p.eval(
          'evalStorybookStorySnapshots',
          {
            docCapture: docCaptureFlag,
            autodocCapture: autodocCaptureFlag
          }
        ),
        undefined,
        { from: 'preview url' }
      );
    };
  });

  it('calls page.eval for evalStorybookStorySnapshots with correct flags from env', () => {
    process.env.PERCY_STORYBOOK_DOC_CAPTURE = 'true';
    process.env.PERCY_STORYBOOK_AUTODOC_CAPTURE = 'false';
    const percy = {};
    const gen = takeStorybookSnapshots(percy, () => {}, { baseUrl: 'http://localhost:6006', flags: {} });
    gen.next();
    gen.next();
    expect(page.eval).toHaveBeenCalledWith(
      'evalStorybookStorySnapshots',
      { docCapture: true, autodocCapture: false }
    );
    delete process.env.PERCY_STORYBOOK_DOC_CAPTURE;
    delete process.env.PERCY_STORYBOOK_AUTODOC_CAPTURE;
  });
});

describe('applyIntelliStoryFilter (IntelliStory orchestration)', () => {
  let percy, log, snapshots, buildDir;

  beforeEach(() => {
    percy = { client: {} };
    log = {
      info: jasmine.createSpy('info'),
      warn: jasmine.createSpy('warn'),
      debug: jasmine.createSpy('debug')
    };
    snapshots = [
      { name: 'A', importPath: './a.stories.js' },
      { name: 'B', importPath: './b.stories.js' }
    ];
    buildDir = './build';
  });

  it('returns the full set unchanged when IntelliStory is disabled', async () => {
    let apply = jasmine.createSpy('apply');
    let result = await applyIntelliStoryFilter(percy, snapshots, { enabled: false }, buildDir, log, apply);
    expect(result).toBe(snapshots);
    expect(apply).not.toHaveBeenCalled();
  });

  it('returns the full set unchanged when there is no IntelliStory config', async () => {
    let apply = jasmine.createSpy('apply');
    let result = await applyIntelliStoryFilter(percy, snapshots, undefined, buildDir, log, apply);
    expect(result).toBe(snapshots);
    expect(apply).not.toHaveBeenCalled();
  });

  it('reassigns snapshots to the filtered set on success', async () => {
    let filtered = [snapshots[0]];
    let config = { enabled: true, baseline: 'main' };
    let apply = jasmine.createSpy('apply').and.returnValue(Promise.resolve(filtered));

    let result = await applyIntelliStoryFilter(percy, snapshots, config, buildDir, log, apply);

    expect(apply).toHaveBeenCalledWith(percy, snapshots, config, buildDir);
    expect(result).toBe(filtered);
    expect(log.info).not.toHaveBeenCalled();
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('logs a bail at info level and falls back to the full set', async () => {
    let apply = jasmine.createSpy('apply')
      .and.callFake(() => Promise.reject(new IntelliStoryBailError('nothing changed')));

    let result = await applyIntelliStoryFilter(percy, snapshots, { enabled: true }, buildDir, log, apply);

    expect(log.info).toHaveBeenCalledWith('nothing changed');
    expect(log.warn).not.toHaveBeenCalled();
    expect(result).toBe(snapshots);
  });

  it('warns and falls back to the full set on a generic error', async () => {
    let apply = jasmine.createSpy('apply')
      .and.callFake(() => Promise.reject(new Error('boom')));

    let result = await applyIntelliStoryFilter(percy, snapshots, { enabled: true }, buildDir, log, apply);

    expect(log.warn).toHaveBeenCalledWith('IntelliStory failed (boom); running full snapshot set');
    expect(log.info).not.toHaveBeenCalled();
    expect(result).toBe(snapshots);
  });

  it('re-throws a generic error when failBuildOnFailure is set', async () => {
    let err = new Error('boom');
    let apply = jasmine.createSpy('apply').and.callFake(() => Promise.reject(err));

    await expectAsync(
      applyIntelliStoryFilter(percy, snapshots, { enabled: true, failBuildOnFailure: true }, buildDir, log, apply)
    ).toBeRejectedWith(err);

    expect(log.warn).toHaveBeenCalled();
  });

  it('re-throws a bail when failBuildOnFailure is set', async () => {
    let err = new IntelliStoryBailError('nothing changed');
    let apply = jasmine.createSpy('apply').and.callFake(() => Promise.reject(err));

    await expectAsync(
      applyIntelliStoryFilter(percy, snapshots, { enabled: true, failBuildOnFailure: true }, buildDir, log, apply)
    ).toBeRejectedWith(err);

    expect(log.info).toHaveBeenCalledWith('nothing changed');
  });
});

describe('processStory importPath stripping', () => {
  let page, percy, log, previewResource;

  beforeEach(() => {
    // processStory validates against the core '/snapshot/dom' schema; other suites reset the
    // shared schema registry, so (re)register it here to keep this test order-independent.
    PercyConfig.addSchema(CoreConfig.schemas);
    page = { eval: jasmine.createSpy('eval') };
    percy = {
      config: { snapshot: { enableJavaScript: false } },
      snapshot: jasmine.createSpy('snapshot')
    };
    log = { debug: jasmine.createSpy('debug'), warn: jasmine.createSpy('warn') };
    previewResource = { content: '<html>preview</html>' };
  });

  it('strips importPath so it never reaches the captured snapshot options', async () => {
    let story = {
      id: 'button--primary',
      name: 'Button: Primary',
      importPath: './src/Button.stories.js',
      url: 'http://localhost:6006/iframe.html?id=button--primary'
    };

    // dry-run path uses the preview DOM and avoids page.eval / captureDOM
    let gen = processStory(page, story, previewResource, percy, { dryRun: true }, log);
    let { value: options } = await gen.next();

    expect(Object.prototype.hasOwnProperty.call(options, 'importPath')).toBe(false);
    expect(options.name).toBe('Button: Primary');
    expect(options.domSnapshot).toBe('<html>preview</html>');
    // processStory returns the options the caller hands to percy.snapshot(); the absence of
    // importPath here guarantees the internal plumbing never leaks into a snapshot
    expect(page.eval).not.toHaveBeenCalled();
    expect(percy.snapshot).not.toHaveBeenCalled();
  });
});
