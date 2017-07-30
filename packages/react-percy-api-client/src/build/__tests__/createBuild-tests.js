import createBuild from '../createBuild';

let percyClient;

beforeEach(() => {
  percyClient = {
    createBuild: jest.fn(),
  };
});

it('returns data when creating the build succeeds', async () => {
  percyClient.createBuild.mockImplementation(() =>
    Promise.resolve({
      body: {
        data: {
          attributes: {
            'web-url': 'http://foo.bar',
          },
          foo: 'bar',
        },
      },
    }),
  );

  const build = await createBuild(percyClient, [{}, {}]);

  expect(build).toEqual({
    attributes: {
      'web-url': 'http://foo.bar',
    },
    foo: 'bar',
  });
});

it('rejects the error response on failure', async () => {
  percyClient.createBuild.mockImplementation(() =>
    Promise.reject({
      response: {
        body: '501 Error',
      },
    }),
  );

  try {
    await createBuild(percyClient, [{}, {}]);
  } catch (e) {
    expect(e).toBe('501 Error');
  }

  expect.assertions(1);
});
