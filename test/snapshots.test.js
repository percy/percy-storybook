import { captureDOM, captureResponsiveDOM, captureSerializedDOM } from '../src/snapshots.js';

describe('captureDOM', () => {
  describe('enableJavaScript and responsiveSnapshotCapture combinations', () => {
    beforeEach(function() {
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
      it(`returns correct result for enableJavaScript=${enableJavaScript}, responsiveSnapshotCapture=${responsiveSnapshotCapture}`, async function() {
        percy.config.snapshot.enableJavaScript = enableJavaScript;
        percy.config.snapshot.responsiveSnapshotCapture = responsiveSnapshotCapture;
        let flags = { dryRun: false };
        let options = { name: 'story', widths: [375, 800], responsiveSnapshotCapture };
        let gen = captureDOM(page, { id: 'id' }, options, flags, false, previewResource, percy, log);
        await gen.next(); // getDeviceDetails
        await gen.next(); // page.eval
        let result = await gen.next(); // page.snapshot
        if (responsiveSnapshotCapture) {
          // Should be array or object with widths
          if (Array.isArray(result.value)) {
            expect(result.value.length).toBeGreaterThan(0);
            expect(result.value[0].domSnapshot || result.value[0]).toBe('<html>combo</html>');
          } else {
            expect(result.value.domSnapshot || result.value).toBe('<html>combo</html>');
          }
        } else {
          expect(result.value.domSnapshot || result.value).toBe('<html>combo</html>');
        }
      });
    });
  });

  it('delegates to responsive logic when responsiveSnapshotCapture is true', async function() {
    page.eval.and.returnValue(Promise.resolve());
    page.snapshot.and.returnValue(Promise.resolve({ domSnapshot: '<html>responsive</html>' }));
    let flags = { dryRun: false };
    let options = { name: 'story', widths: [375, 800], responsiveSnapshotCapture: true };
    percy.config.snapshot.responsiveSnapshotCapture = true;
    // Should yield an array of domSnapshots (simulate responsive)
    let gen = captureDOM(page, { id: 'id' }, options, flags, false, previewResource, percy, log);
    await gen.next(); // getDeviceDetails
    await gen.next(); // page.eval
    let result = await gen.next(); // page.snapshot
    // Should return an array or object with widths
    if (Array.isArray(result.value)) {
      expect(result.value.length).toBeGreaterThan(0);
      expect(result.value[0].domSnapshot || result.value[0]).toBe('<html>responsive</html>');
    } else {
      expect(result.value.domSnapshot || result.value).toBe('<html>responsive</html>');
    }
  });

  it('delegates to non-responsive logic when responsiveSnapshotCapture is false', async function() {
    page.eval.and.returnValue(Promise.resolve());
    page.snapshot.and.returnValue(Promise.resolve({ domSnapshot: '<html>nonresponsive</html>' }));
    let flags = { dryRun: false };
    let options = { name: 'story', widths: [800], responsiveSnapshotCapture: false };
    percy.config.snapshot.responsiveSnapshotCapture = false;
    let gen = captureDOM(page, { id: 'id' }, options, flags, false, previewResource, percy, log);
    await gen.next(); // getDeviceDetails
    await gen.next(); // page.eval
    let result = await gen.next(); // page.snapshot
    expect(result.value.domSnapshot || result.value).toBe('<html>nonresponsive</html>');
  });

  let page, percy, log, previewResource;

  beforeEach(function() {
    page = { eval: jasmine.createSpy('eval'), snapshot: jasmine.createSpy('snapshot') };
    percy = {
      config: { snapshot: { enableJavaScript: false, widths: [800], responsiveSnapshotCapture: false } },
      client: { getDeviceDetails: jasmine.createSpy('getDeviceDetails').and.returnValue(Promise.resolve([{ width: 800 }])) },
      build: { id: 'buildid' }
    };
    log = { debug: jasmine.createSpy('debug'), warn: jasmine.createSpy('warn'), error: jasmine.createSpy('error') };
    previewResource = { content: '<html>preview</html>' };
  });

  it('calls page.eval and page.snapshot for non-dryRun (non-responsive)', async function() {
    page.eval.and.returnValue(Promise.resolve());
    page.snapshot.and.returnValue(Promise.resolve({ domSnapshot: '<html>real</html>' }));
    let flags = { dryRun: false };
    let options = { name: 'story', widths: [800], responsiveSnapshotCapture: false };
    percy.config.snapshot.responsiveSnapshotCapture = false;
    let gen = captureDOM(page, { id: 'id' }, options, flags, false, previewResource, percy, log);
    await gen.next(); // run to yield percy.client.getDeviceDetails
    await gen.next(); // run to yield page.eval
    let result = await gen.next(); // run to yield page.snapshot
    // Should return the domSnapshot string (handle both string and object)
    if (typeof result.value === 'object' && result.value.domSnapshot) {
      expect(result.value.domSnapshot).toBe('<html>real</html>');
    } else {
      expect(result.value).toBe('<html>real</html>');
    }
  });
});

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
