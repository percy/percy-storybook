import finalizeBuild from '../finalizeBuild';

let percyClient;

beforeEach(() => {
  percyClient = {
    finalizeBuild: jest.fn()
  };
});

it('finalizes the specified build', async () => {
  const build = {
    id: 'buildid'
  };
  percyClient.finalizeBuild.mockImplementation(() => Promise.resolve());

  await finalizeBuild(percyClient, build);

  expect(percyClient.finalizeBuild).toHaveBeenCalledWith(build.id);
});

it('rejects the error response on failure', async () => {
  const build = {
    id: 'buildid'
  };
  percyClient.finalizeBuild.mockImplementation(() => Promise.reject({
    response: {
      body: '501 Error'
    }
  }));

  try {
    await finalizeBuild(percyClient, build);
  } catch (e) {
    expect(e).toBe('501 Error');
  }

  expect.assertions(1);
});
