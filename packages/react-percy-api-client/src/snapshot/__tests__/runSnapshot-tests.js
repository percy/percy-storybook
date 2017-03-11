import createSnapshot from '../createSnapshot';
import finalizeSnapshot from '../finalizeSnapshot';
import runSnapshot from '../runSnapshot';
import { uploadResources } from '../../resources';

const mockResource = { resource: true };
let mockMissingResources;
jest.mock('../../resources', () => ({
    makeRootResource: jest.fn(() => mockResource),
    getMissingResourceShas: jest.fn(() => mockMissingResources),
    uploadResources: jest.fn(() => Promise.resolve())
}));

const mockSnapshot = { id: 'snapshotid' };
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

it('creates a snapshot for the given test case', async () => {
    const testCase = {
        name: 'test case',
        markup: '<div>test</div>',
        sizes: [{ width: 320 }, { width: 768 }]
    };

    await runSnapshot(percyClient, build, testCase, assets, renderer);

    expect(createSnapshot).toHaveBeenCalledWith(percyClient, build, 'test case', mockResource, [{ width: 320 }, { width: 768 }]);
});

it('does not re-upload resource given nothing has changed', async () => {
    const testCase = {
        name: 'test case',
        markup: '<div>test</div>'
    };
    mockMissingResources = [];

    await runSnapshot(percyClient, build, testCase, assets, renderer);

    expect(uploadResources).not.toHaveBeenCalled();
});

it('re-uploads resource given changes', async () => {
    const testCase = {
        name: 'test case',
        markup: '<div>test</div>'
    };
    mockMissingResources = ['foo'];

    await runSnapshot(percyClient, build, testCase, assets, renderer);

    expect(uploadResources).toHaveBeenCalledWith(percyClient, build, [mockResource]);
});

it('finalizes the snapshot', async () => {
    const testCase = {
        name: 'test case',
        markup: '<div>test</div>'
    };

    await runSnapshot(percyClient, build, testCase, assets, renderer);

    expect(finalizeSnapshot).toHaveBeenCalledWith(percyClient, mockSnapshot, 'test case');
});
