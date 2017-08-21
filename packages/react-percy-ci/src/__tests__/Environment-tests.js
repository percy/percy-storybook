import Environment from '../Environment';

let mockFrameworkGlobals;
jest.mock('@percy-io/react-percy-test-framework', () => context => {
  Object.keys(mockFrameworkGlobals).forEach(key => {
    context[key] = mockFrameworkGlobals[key];
  });
});

let environment;
let suiteSnapshots;

beforeEach(() => {
  suiteSnapshots = [];
  mockFrameworkGlobals = {
    percySnapshot: jest.fn(name => suiteSnapshots.push(name)),
    suite: jest.fn((name, fn) => fn()),
  };

  environment = new Environment();
});

it('can parse basic files', async () => {
  await environment.runScript(`
    const a = 1;
  `);
});

it('references to window work', async () => {
  await environment.runScript(`
    const location = window.location.href;
  `);
});

it('references to document work', async () => {
  await environment.runScript(`
    const body = document.body;
  `);
});

it('framework globals work', async () => {
  await environment.runScript(`
    percySnapshot('snapshot', () => {
    });
  `);

  expect(mockFrameworkGlobals.percySnapshot).toHaveBeenCalledWith('snapshot', expect.any(Function));
});
