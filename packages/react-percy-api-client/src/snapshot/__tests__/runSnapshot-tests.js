import { makeRootResource, uploadResources } from '../../resources';
import createSnapshot from '../createSnapshot';
import finalizeSnapshot from '../finalizeSnapshot';
import runSnapshot from '../runSnapshot';

const mockResource = { resource: true };
let mockMissingResources;
jest.mock('../../resources', () => ({
  makeRootResource: jest.fn(() => mockResource),
  getMissingResourceShas: jest.fn(() => mockMissingResources),
  uploadResources: jest.fn(() => Promise.resolve()),
}));

const mockSnapshot = { id: 'percySnapshotId' };
jest.mock('../createSnapshot', () => jest.fn(() => Promise.resolve(mockSnapshot)));

jest.mock('../finalizeSnapshot', () => jest.fn(() => Promise.resolve()));

let percyClient;
let build;
let html;

beforeEach(() => {
  percyClient = {};
  build = { id: 'buildid' };
  html = '<html><body><div>mock HTML</div></body></html>';
  mockMissingResources = [];
});

it('creates a percy snapshot for the given snapshot', async () => {
  const snapshot = {
    name: 'snapshot',
    options: { widths: [320, 768] },
  };

  await runSnapshot(percyClient, build, snapshot, html);

  expect(createSnapshot).toHaveBeenCalledWith(percyClient, build, [mockResource], {
    name: 'snapshot',
    widths: [320, 768],
    enableJavaScript: true,
  });
});

it('creates a root resource from the given html given no query param builder', async () => {
  const snapshot = {
    name: 'snapshot',
    options: { widths: [320, 768] },
  };

  await runSnapshot(percyClient, build, snapshot, html);

  expect(makeRootResource).toHaveBeenCalledWith(percyClient, 'snapshot', html, '');
});

it('creates a root resource from the given html with encoded parameters given query param builder', async () => {
  const snapshot = {
    name: 'snapshot',
    options: { widths: [320, 768] },
  };
  const getQueryParams = snapshot => ({
    name: snapshot.name,
    special: '&:?',
  });

  await runSnapshot(percyClient, build, snapshot, html, getQueryParams);

  expect(makeRootResource).toHaveBeenCalledWith(
    percyClient,
    'snapshot',
    html,
    'name=snapshot&special=%26%3A%3F',
  );
});

it('does not re-upload resource given nothing has changed', async () => {
  const snapshot = {
    name: 'snapshot',
    options: {},
  };
  mockMissingResources = [];

  await runSnapshot(percyClient, build, snapshot, html);

  expect(uploadResources).not.toHaveBeenCalled();
});

it('re-uploads resource given changes', async () => {
  const snapshot = {
    name: 'snapshot',
    options: {},
  };
  mockMissingResources = ['foo'];

  await runSnapshot(percyClient, build, snapshot, html);

  expect(uploadResources).toHaveBeenCalledWith(percyClient, build, [mockResource]);
});

it('finalizes the percySnapshot', async () => {
  const snapshot = {
    name: 'snapshot',
    options: {},
  };

  await runSnapshot(percyClient, build, snapshot, html);

  expect(finalizeSnapshot).toHaveBeenCalledWith(percyClient, mockSnapshot, 'snapshot');
});
