import uploadStory from '../uploadStory';

const mockResource = { resource: true };
const mockSnapshot = { id: 'snapshotid' };
const storyHtml = '<html></html>';
const build = { id: 'buildid' };

let mockMissingResources;
let percyClient;
let assets;

beforeEach(() => {
  percyClient = {
    createSnapshot: jest.fn(() => Promise.resolve(mockSnapshot)),
    finalizeSnapshot: jest.fn(() => Promise.resolve()),
    getMissingResourceShas: jest.fn(() => mockMissingResources),
    makeRootResource: jest.fn(() => mockResource),
    uploadResources: jest.fn(() => Promise.resolve())
  };
  assets = {};
  mockMissingResources = [];
});

it('creates a snapshot for the given test case', async () => {
  const story = {
    name: 'test case',
    markup: '<div>test</div>'
  };

  await uploadStory(percyClient, build, story, [320, 768], 100, assets, storyHtml);

  expect(percyClient.createSnapshot).toHaveBeenCalledWith(build, [mockResource], {
    name: 'test case', widths: [320, 768], minimumHeight: 100, enableJavaScript: true
  });
});

it('does not re-upload resource given nothing has changed', async () => {
  const story = {
    name: 'test case',
    markup: '<div>test</div>'
  };
  mockMissingResources = [];

  await uploadStory(percyClient, build, story, [320, 768], 100, assets, storyHtml);

  expect(percyClient.uploadResources).not.toHaveBeenCalled();
});

it('re-uploads resource given changes', async () => {
  const story = {
    name: 'test case',
    markup: '<div>test</div>'
  };
  mockMissingResources = ['foo'];

  await uploadStory(percyClient, build, story, [320, 768], 100, assets, storyHtml);

  expect(percyClient.uploadResources).toHaveBeenCalledWith(build, [mockResource]);
});

it('finalizes the snapshot', async () => {
  const story = {
    name: 'test case',
    markup: '<div>test</div>'
  };

  await uploadStory(percyClient, build, story, assets, storyHtml);

  expect(percyClient.finalizeSnapshot).toHaveBeenCalledWith(mockSnapshot, 'test case');
});
