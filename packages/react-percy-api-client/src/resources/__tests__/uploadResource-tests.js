import uploadResource from '../uploadResource';

let percyClient;

beforeEach(() => {
  percyClient = {
    uploadResource: jest.fn(),
  };
});

it('uploads the specified resource', async () => {
  const build = {
    id: 'build123',
  };
  const resource = {
    content: 'resource contents',
  };
  percyClient.uploadResource.mockImplementation(() => Promise.resolve());

  await uploadResource(percyClient, build, resource);

  expect(percyClient.uploadResource).toHaveBeenCalledWith('build123', 'resource contents');
});

it('rejects the error response on failure', async () => {
  const build = {
    id: 'build123',
  };
  const resource = {
    content: 'resource contents',
  };
  percyClient.uploadResource.mockImplementation(() =>
    Promise.reject({
      response: {
        body: '501 Error',
      },
    }),
  );

  try {
    await uploadResource(percyClient, build, resource);
  } catch (e) {
    expect(e).toBe('501 Error');
  }

  expect.assertions(1);
});
