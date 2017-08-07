import createSnapshot from '../createSnapshot';
import finalizeSnapshot from '../finalizeSnapshot';
import runSnapshot from '../runSnapshot';
import { uploadResources } from '../../resources';

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
let assets;
let renderer;

beforeEach(() => {
  percyClient = {};
  build = { id: 'buildid' };
  assets = {};
  renderer = () => '<div>mock HTML</div>';
  mockMissingResources = [];
});

it('creates a percy snapshot for the given snapshot', async () => {
  const snapshot = {
    name: 'snapshot',
    markup: '<div>snapshot</div>',
    options: { widths: [320, 768] },
  };

  await runSnapshot(percyClient, build, snapshot, assets, renderer);

  expect(createSnapshot).toHaveBeenCalledWith(percyClient, build, [mockResource], {
    name: 'snapshot',
    widths: [320, 768],
  });
});

it('does not re-upload resource given nothing has changed', async () => {
  const snapshot = {
    name: 'snapshot',
    markup: '<div>snapshot</div>',
    options: {},
  };
  mockMissingResources = [];

  await runSnapshot(percyClient, build, snapshot, assets, renderer);

  expect(uploadResources).not.toHaveBeenCalled();
});

it('re-uploads resource given changes', async () => {
  const snapshot = {
    name: 'snapshot',
    markup: '<div>snapshot</div>',
    options: {},
  };
  mockMissingResources = ['foo'];

  await runSnapshot(percyClient, build, snapshot, assets, renderer);

  expect(uploadResources).toHaveBeenCalledWith(percyClient, build, [mockResource]);
});

it('finalizes the percySnapshot', async () => {
  const snapshot = {
    name: 'snapshot',
    markup: '<div>snapshot</div>',
    options: {},
  };

  await runSnapshot(percyClient, build, snapshot, assets, renderer);

  expect(finalizeSnapshot).toHaveBeenCalledWith(percyClient, mockSnapshot, 'snapshot');
});
