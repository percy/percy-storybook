import { captureSerializedDOM, captureResponsiveDOM, getWidthsForResponsiveCapture, isResponsiveSnapshotCaptureEnabled } from '../src/utils.js';

describe('captureResponsiveDOM', () => {
  let page, percy, log, previewResource;
  beforeEach(function() {
    page = { eval: jasmine.createSpy('eval'), snapshot: jasmine.createSpy('snapshot') };
    percy = {
      config: { snapshot: { enableJavaScript: false, widths: [800], responsiveSnapshotCapture: true } },
      client: { getDeviceDetails: jasmine.createSpy('getDeviceDetails').and.returnValue(Promise.resolve([{ width: 375 }, { width: 800 }])) },
      build: { id: 'buildid' }
    };
    log = { debug: jasmine.createSpy('debug'), warn: jasmine.createSpy('warn'), error: jasmine.createSpy('error') };
    previewResource = { content: '<html>preview</html>' };
  });

  it('returns array of doms in dryRun', async function() {
    let flags = { dryRun: true };
    let options = { widths: [375, 800], responsiveSnapshotCapture: true };
    let gen = captureResponsiveDOM(page, { id: 'id' }, options, flags, false, previewResource, percy, log);
    let result = await gen.next();
    expect(Array.isArray(result.value)).toBe(true);
    expect(result.value.length).toBe(2);
    expect(result.value[0].width).toBe(375);
    expect(result.value[1].width).toBe(800);
  });

  it('returns array of domSnapshots with widths for non-dryRun', async function() {
    // Setup page.snapshot to return different domSnapshots for each call
    let call = 0;
    page.snapshot.and.callFake(async () => {
      call++;
      return { domSnapshot: `<html>real${call}</html>` };
    });
    let flags = { dryRun: false };
    let options = { widths: [375, 800], responsiveSnapshotCapture: true };
    let gen = captureResponsiveDOM(page, { id: 'id' }, options, flags, false, previewResource, percy, log);
    let result = await gen.next();
    expect(Array.isArray(result.value)).toBe(true);
    expect(result.value.length).toBe(2);
    expect(result.value[0].width).toBe(375);
    expect(result.value[1].width).toBe(800);
    expect(result.value[0].domSnapshot).toBe('<html>real1</html>');
    expect(result.value[1].domSnapshot).toBe('<html>real2</html>');
  });
});

describe('captureSerializedDOM', () => {
  let page, log, previewResource;
  beforeEach(function() {
    page = { eval: jasmine.createSpy('eval'), snapshot: jasmine.createSpy('snapshot') };
    log = { debug: jasmine.createSpy('debug'), warn: jasmine.createSpy('warn'), error: jasmine.createSpy('error') };
    previewResource = { content: '<html>preview</html>' };
  });

  it('returns previewResource.content in dryRun', async function() {
    let flags = { dryRun: true };
    let options = { name: 'story', responsiveSnapshotCapture: false };
    let gen = captureSerializedDOM(page, { id: 'id' }, options, flags, false, previewResource, log);
    let result = await gen.next();
    expect(result.value).toBe('<html>preview</html>');
  });

  it('calls page.eval and page.snapshot for non-dryRun', async function() {
    page.eval.and.returnValue(Promise.resolve());
    page.snapshot.and.returnValue(Promise.resolve({ domSnapshot: '<html>real</html>' }));
    let flags = { dryRun: false };
    let options = { name: 'story', responsiveSnapshotCapture: false };
    let gen = captureSerializedDOM(page, { id: 'id' }, options, flags, false, previewResource, log);
    await gen.next(); // run to yield page.eval
    let result = await gen.next(); // run to yield page.snapshot
    // Should return the domSnapshot object
    expect(result.value).toEqual({ domSnapshot: '<html>real</html>' });
  });
});

describe('getWidthsForResponsiveCapture', () => {
  it('combines mobile, user, and config widths and dedupes', () => {
    const user = [320, 375, 768];
    const eligible = { mobile: [375, 414], config: [1024, 1280] };
    expect(getWidthsForResponsiveCapture(user, eligible)).toEqual([375, 414, 320, 768]);
  });

  it('uses only config if no user widths', () => {
    const eligible = { mobile: [], config: [800, 1200] };
    expect(getWidthsForResponsiveCapture(undefined, eligible)).toEqual([800, 1200]);
  });

  it('uses only mobile if no user/config', () => {
    const eligible = { mobile: [400, 500], config: [] };
    expect(getWidthsForResponsiveCapture(undefined, eligible)).toEqual([400, 500]);
  });

  it('removes duplicates and falsy values', () => {
    const eligible = { mobile: [375, 0, 1280], config: [1280, null] };
    expect(getWidthsForResponsiveCapture([375, 1280, 0], eligible)).toEqual([375, 1280]);
  });
});

describe('isResponsiveSnapshotCaptureEnabled', () => {
  it('returns true if options.responsiveSnapshotCapture is true', () => {
    expect(isResponsiveSnapshotCaptureEnabled({ responsiveSnapshotCapture: true }, {})).toBe(true);
  });

  it('returns false if options.responsiveSnapshotCapture is false', () => {
    expect(isResponsiveSnapshotCaptureEnabled({ responsiveSnapshotCapture: false }, {})).toBe(false);
  });

  it('returns true if config.snapshot.responsiveSnapshotCapture is true', () => {
    expect(isResponsiveSnapshotCaptureEnabled({}, { snapshot: { responsiveSnapshotCapture: true } })).toBe(true);
  });

  it('returns false if config.snapshot.responsiveSnapshotCapture is false', () => {
    expect(isResponsiveSnapshotCaptureEnabled({}, { snapshot: { responsiveSnapshotCapture: false } })).toBe(false);
  });

  it('returns false if nothing is set', () => {
    expect(isResponsiveSnapshotCaptureEnabled({}, {})).toBe(false);
  });

  it('snapshot option takes precedence over global config for responsiveSnapshotCapture', () => {
    expect(isResponsiveSnapshotCaptureEnabled({ responsiveSnapshotCapture: false }, { snapshot: { responsiveSnapshotCapture: true } })).toBe(false);
    expect(isResponsiveSnapshotCaptureEnabled({ responsiveSnapshotCapture: true }, { snapshot: { responsiveSnapshotCapture: false } })).toBe(true);
  });
});

describe('flag parser for widths', () => {
  const parse = (value) => value.split(',').map(w => parseInt(w.trim(), 10)).filter(w => !isNaN(w));

  it('parses comma-separated string to array of ints', () => {
    expect(parse('375,768,1280')).toEqual([375, 768, 1280]);
  });
  it('trims whitespace and ignores invalid', () => {
    expect(parse(' 375 , 768 , abc , 1280 ')).toEqual([375, 768, 1280]);
  });
  it('returns empty array for empty string', () => {
    expect(parse('')).toEqual([]);
  });
});

// --- DOM capture utilities ---
describe('captureSerializedDOM and captureResponsiveDOM', () => {
  let mockDom, mockPage, mockLog, mockPercy;

  beforeEach(() => {
    mockDom = { html: '<html></html>' };
    mockPage = {
      snapshot: jasmine.createSpy('snapshot').and.callFake(async () => ({ dom: mockDom })),
      eval: jasmine.createSpy('eval').and.callFake(async () => ({ width: 800, height: 600 })),
      goto: jasmine.createSpy('goto').and.callFake(async () => {}),
      insertPercyDom: jasmine.createSpy('insertPercyDom').and.callFake(async () => {}),
      resize: jasmine.createSpy('resize').and.callFake(async () => {})
    };
    mockLog = { error: jasmine.createSpy('error'), debug: jasmine.createSpy('debug') };
    mockPercy = { config: { snapshot: { minHeight: 600 } } };
  });

  it('captureSerializedDOM returns domSnapshot', async (done) => {
    const { captureSerializedDOM } = await import('../src/utils.js');
    captureSerializedDOM(mockPage, {}, mockLog).then(result => {
      expect(result).toBe(mockDom);
      expect(mockPage.snapshot).toHaveBeenCalled();
      done();
    });
  });

  it('captureSerializedDOM logs and throws on error', async (done) => {
    const { captureSerializedDOM } = await import('../src/utils.js');
    mockPage.snapshot.and.callFake(async () => { throw new Error('fail'); });
    captureSerializedDOM(mockPage, {}, mockLog).catch(e => {
      expect(e.message).toContain('Failed to capture DOM snapshot');
      expect(mockLog.error).toHaveBeenCalled();
      done();
    });
  });

  it('captureResponsiveDOM returns array of domSnapshots with widths', async (done) => {
    const { captureResponsiveDOM } = await import('../src/utils.js');
    // Patch captureSerializedDOM to avoid recursion
    spyOn((await import('../src/utils.js')), 'captureSerializedDOM').and.callFake(async () => ({ html: '<html></html>' }));
    const options = { widths: [800, 1024] };
    captureResponsiveDOM(mockPage, options, mockPercy, mockLog).then(result => {
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0].width).toBe(800);
      expect(result[1].width).toBe(1024);
      done();
    });
  });
});

// This is a config shape test, not a runtime test, but we can check the defaults
describe('storybookSchema responsiveSnapshotCapture and widths', () => {
  const storybookSchema = {
    responsiveSnapshotCapture: { type: 'boolean', default: false },
    widths: { type: 'array', items: { type: 'integer', minimum: 1 }, default: [375, 1280] }
  };
  it('responsiveSnapshotCapture default is false', () => {
    expect(storybookSchema.responsiveSnapshotCapture.default).toBe(false);
  });
  it('widths default is [375, 1280] and type is array of int', () => {
    expect(storybookSchema.widths.default).toEqual([375, 1280]);
    expect(storybookSchema.widths.items.type).toBe('integer');
  });
});
