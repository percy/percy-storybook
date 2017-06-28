import finalizeSnapshot from '../finalizeSnapshot';

let percyClient;

beforeEach(() => {
  percyClient = {
    finalizeSnapshot: jest.fn()
  };
});

it('finalizes the specified snapshot', async () => {
  const name = 'name';
  const snapshot = {
    id: 'snapshotid'
  };
  percyClient.finalizeSnapshot.mockImplementation(() => Promise.resolve());

  await finalizeSnapshot(percyClient, snapshot, name);

  expect(percyClient.finalizeSnapshot).toHaveBeenCalledWith(snapshot.id);
});
