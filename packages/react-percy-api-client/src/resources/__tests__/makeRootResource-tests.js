import makeRootResource from '../makeRootResource';

let percyClient;

beforeEach(() => {
  percyClient = {
    makeResource: data => data,
  };
});

it('sets resource URL to slug-ified snapshot name', () => {
  const snapshotName = 'Suite - renders my component';
  const html = '<html></html>';

  const rootResource = makeRootResource(percyClient, snapshotName, html);

  expect(rootResource).toEqual(
    expect.objectContaining({
      resourceUrl: '/suite-renders-my-component.html',
    }),
  );
});

it('sets content to the HTML', () => {
  const snapshotName = 'Suite - renders my component';
  const html = '<html></html>';

  const rootResource = makeRootResource(percyClient, snapshotName, html);

  expect(rootResource).toEqual(
    expect.objectContaining({
      content: html,
    }),
  );
});

it('marks resource as a root resource', () => {
  const snapshotName = 'Suite - renders my component';
  const html = '<html></html>';

  const rootResource = makeRootResource(percyClient, snapshotName, html);

  expect(rootResource).toEqual(
    expect.objectContaining({
      isRoot: true,
    }),
  );
});

it('sets the mimetype to HTML', () => {
  const snapshotName = 'Suite - renders my component';
  const html = '<html></html>';

  const rootResource = makeRootResource(percyClient, snapshotName, html);

  expect(rootResource).toEqual(
    expect.objectContaining({
      mimetype: 'text/html',
    }),
  );
});
