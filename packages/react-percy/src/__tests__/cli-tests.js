import { run } from '../cli';
import runPercy from '../runPercy';
import yargs from 'yargs';

const VERSION = require('../../package.json').version;

// eslint-disable-next-line no-console
console.log = jest.fn();

let mockYargs;
jest.mock('yargs', () => {
  const fakeYargs = () => mockYargs;
  fakeYargs.showHelp = jest.fn();
  return fakeYargs;
});

const mockPercyConfig = { percy: 'config' };
jest.mock('@percy-io/react-percy-config', () => () => mockPercyConfig);

const mockWebpackConfig = { webpack: 'config' };
jest.mock('@percy-io/react-percy-webpack', () => ({
  resolve: () => mockWebpackConfig,
}));

jest.mock('../runPercy', () => jest.fn());

let argv;
let stdout;

beforeEach(() => {
  argv = {};
  mockYargs = {
    argv,
    alias: jest.fn(() => mockYargs),
    epilogue: jest.fn(() => mockYargs),
    help: jest.fn(() => mockYargs),
    options: jest.fn(() => mockYargs),
    usage: jest.fn(() => mockYargs),
  };

  process.exit = jest.fn();
  process.on = jest.fn((event, cb) => cb());

  stdout = [];
  process.stdout.write = message => stdout.push(message);
});

it('shows help text given help arg', async () => {
  argv.help = true;

  await run();

  expect(yargs.showHelp).toHaveBeenCalled();
});

it('exits with error code given help arg', async () => {
  argv.help = true;

  await run();

  expect(process.exit).toHaveBeenCalledWith(1);
});

it('prints the current `react-percy` version given version arg', async () => {
  argv.version = true;

  await run();

  expect(stdout.join('')).toBe(`v${VERSION}\n`);
});

it('exits with success code given version arg', async () => {
  argv.version = true;

  await run();

  expect(process.exit).toHaveBeenCalledWith(0);
});

it('exits with success code given running succeeds', async () => {
  runPercy.mockImplementation(() => Promise.resolve());

  await run();

  expect(process.exit).toHaveBeenCalledWith(0);
});

it('exits with error code given running fails', async () => {
  runPercy.mockImplementation(() => Promise.reject());

  await run();

  expect(process.exit).toHaveBeenCalledWith(1);
});
