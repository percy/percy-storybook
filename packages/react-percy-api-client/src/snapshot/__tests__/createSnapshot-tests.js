import createSnapshot from '../createSnapshot';

let percyClient;

beforeEach(() => {
  percyClient = {
    createSnapshot: jest.fn()
  };
});

it('returns data when creating the snapshot succeeds', async () => {
  const build = {
    id: 'buildid'
  };
  const name = 'name';
  const resources = [];
  percyClient.createSnapshot.mockImplementation(() => Promise.resolve({
    body: {
      data: {
        foo: 'bar'
      }
    }
  }));

  const snapshot = await createSnapshot(percyClient, build, resources, { name, width: 320 });

  expect(snapshot).toEqual({
    foo: 'bar'
  });
});
