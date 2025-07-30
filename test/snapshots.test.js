import { captureDOM, captureResponsiveDOM, captureSerializedDOM } from '../src/snapshots.js';

describe('captureDOM', () => {
  let page, percy, log, previewResource;

  beforeEach(function() {
    page = { eval: jasmine.createSpy('eval'), snapshot: jasmine.createSpy('snapshot') };
    percy = {
      config: { snapshot: { enableJavaScript: false, widths: [800] } },
      client: { getDeviceDetails: jasmine.createSpy('getDeviceDetails').and.returnValue(Promise.resolve([{ width: 375 }, { width: 800 }])) },
      build: { id: 'buildid' }
    };
    log = { debug: jasmine.createSpy('debug'), warn: jasmine.createSpy('warn'), error: jasmine.createSpy('error') };
    previewResource = { content: '<html>preview</html>' };
  });

  it('returns previewResource.content in dryRun', async function() {
    let flags = { dryRun: true };
    let gen = captureDOM(page, { id: 'id' }, { name: 'story', widths: [800] }, flags, false, previewResource, percy, log);
    let result = await gen.next();
    expect(result.value).toBe('<html>preview</html>');
  });

  it('returns previewResource.content if enableJavaScript', async function() {
    let flags = { dryRun: false };
    let gen = captureDOM(page, { id: 'id' }, { name: 'story', widths: [800] }, flags, true, previewResource, percy, log);
    let result = await gen.next();
    expect(result.value).toBe('<html>preview</html>');
  });

  it('calls page.eval and page.snapshot for non-dryRun', async function() {
    page.eval.and.returnValue(Promise.resolve());
    page.snapshot.and.returnValue(Promise.resolve({ domSnapshot: '<html>real</html>' }));
    let flags = { dryRun: false };
    let gen = captureDOM(page, { id: 'id' }, { name: 'story', widths: [800] }, flags, false, previewResource, percy, log);
    await gen.next(); // run to yield page.eval
    let result = await gen.next(); // run to yield page.snapshot
    expect(page.eval).toHaveBeenCalled();
    expect(page.snapshot).toHaveBeenCalled();
    expect(result.value).toBe('<html>real</html>');
  });
});

describe('captureResponsiveDOM', () => {
  let page, percy, log, previewResource;
  beforeEach(function() {
    page = { eval: jasmine.createSpy('eval'), snapshot: jasmine.createSpy('snapshot') };
    percy = {
      config: { snapshot: { enableJavaScript: false, widths: [800] } },
      client: { getDeviceDetails: jasmine.createSpy('getDeviceDetails').and.returnValue(Promise.resolve([{ width: 375 }, { width: 800 }])) },
      build: { id: 'buildid' }
    };
    log = { debug: jasmine.createSpy('debug'), warn: jasmine.createSpy('warn'), error: jasmine.createSpy('error') };
    previewResource = { content: '<html>preview</html>' };
  });

  it('returns array of doms in dryRun', async function() {
    let flags = { dryRun: true };
    let options = { widths: [375, 800] };
    let gen = captureResponsiveDOM(page, { id: 'id' }, options, flags, false, previewResource, percy, log);
    let result = await gen.next();
    expect(Array.isArray(result.value)).toBe(true);
    expect(result.value.length).toBe(2);
    expect(result.value[0]).toHaveProperty('width', 375);
    expect(result.value[1]).toHaveProperty('width', 800);
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
    let options = { name: 'story' };
    let gen = captureSerializedDOM(page, { id: 'id' }, options, flags, false, previewResource, log);
    let result = await gen.next();
    expect(result.value).toBe('<html>preview</html>');
  });

  it('calls page.eval and page.snapshot for non-dryRun', async function() {
    page.eval.and.returnValue(Promise.resolve());
    page.snapshot.and.returnValue(Promise.resolve({ domSnapshot: '<html>real</html>' }));
    let flags = { dryRun: false };
    let options = { name: 'story' };
    let gen = captureSerializedDOM(page, { id: 'id' }, options, flags, false, previewResource, log);
    await gen.next(); // run to yield page.eval
    let result = await gen.next(); // run to yield page.snapshot
    expect(page.eval).toHaveBeenCalled();
    expect(page.snapshot).toHaveBeenCalled();
    expect(result.value).toBe('<html>real</html>');
  });
});
