import { captureDOM, captureResponsiveDOM, captureSerializedDOM } from '../src/snapshots.js';

describe('captureDOM', () => {
  var page, percy, log, previewResource;

  beforeEach(function() {
    page = { eval: jasmine.createSpy('eval'), snapshot: jasmine.createSpy('snapshot') };
    percy = {
      config: { snapshot: { enableJavaScript: false, widths: [800], responsiveSnapshotCapture: false } },
      client: { getDeviceDetails: jasmine.createSpy('getDeviceDetails').and.returnValue(Promise.resolve([{ width: 375 }, { width: 800 }])) },
      build: { id: 'buildid' }
    };
    log = { debug: jasmine.createSpy('debug'), warn: jasmine.createSpy('warn'), error: jasmine.createSpy('error') };
    previewResource = { content: '<html>preview</html>' };
  });

  it('returns previewResource.content in dryRun', async function() {
    var flags = { dryRun: true };
    var options = { name: 'story', widths: [800], responsiveSnapshotCapture: false };
    var gen = captureDOM(page, { id: 'id' }, options, flags, false, previewResource, percy, log);
    var result = await gen.next();
    expect(result.value).toBe('<html>preview</html>');
  });

  it('returns previewResource.content if enableJavaScript', async function() {
    var flags = { dryRun: false };
    var options = { name: 'story', widths: [800], responsiveSnapshotCapture: false };
    var gen = captureDOM(page, { id: 'id' }, options, flags, true, previewResource, percy, log);
    var result = await gen.next();
    expect(result.value).toBe('<html>preview</html>');
  });

  it('calls page.eval and page.snapshot for non-dryRun', async function() {
    page.eval.and.returnValue(Promise.resolve());
    page.snapshot.and.returnValue(Promise.resolve({ domSnapshot: '<html>real</html>' }));
    var flags = { dryRun: false };
    var options = { name: 'story', widths: [800], responsiveSnapshotCapture: false };
    var gen = captureDOM(page, { id: 'id' }, options, flags, false, previewResource, percy, log);
    await gen.next(); // run to yield page.eval
    var result = await gen.next(); // run to yield page.snapshot
    expect(page.eval).toHaveBeenCalled();
    expect(page.snapshot).toHaveBeenCalled();
    expect(result.value).toBe('<html>real</html>');
  });
});

describe('captureResponsiveDOM', () => {
  var page, percy, log, previewResource;
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
    var flags = { dryRun: true };
    var options = { widths: [375, 800], responsiveSnapshotCapture: true };
    var gen = captureResponsiveDOM(page, { id: 'id' }, options, flags, false, previewResource, percy, log);
    var result = await gen.next();
    expect(Array.isArray(result.value)).toBe(true);
    expect(result.value.length).toBe(2);
    expect(result.value[0].width).toBe(375);
    expect(result.value[1].width).toBe(800);
  });
});

describe('captureSerializedDOM', () => {
  var page, log, previewResource;
  beforeEach(function() {
    page = { eval: jasmine.createSpy('eval'), snapshot: jasmine.createSpy('snapshot') };
    log = { debug: jasmine.createSpy('debug'), warn: jasmine.createSpy('warn'), error: jasmine.createSpy('error') };
    previewResource = { content: '<html>preview</html>' };
  });

  it('returns previewResource.content in dryRun', async function() {
    var flags = { dryRun: true };
    var options = { name: 'story', responsiveSnapshotCapture: false };
    var gen = captureSerializedDOM(page, { id: 'id' }, options, flags, false, previewResource, log);
    var result = await gen.next();
    expect(result.value).toBe('<html>preview</html>');
  });

  it('calls page.eval and page.snapshot for non-dryRun', async function() {
    page.eval.and.returnValue(Promise.resolve());
    page.snapshot.and.returnValue(Promise.resolve({ domSnapshot: '<html>real</html>' }));
    var flags = { dryRun: false };
    var options = { name: 'story', responsiveSnapshotCapture: false };
    var gen = captureSerializedDOM(page, { id: 'id' }, options, flags, false, previewResource, log);
    await gen.next(); // run to yield page.eval
    var result = await gen.next(); // run to yield page.snapshot
    expect(page.eval).toHaveBeenCalled();
    expect(page.snapshot).toHaveBeenCalled();
    expect(result.value).toBe('<html>real</html>');
  });
});
