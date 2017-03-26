// eslint-disable-next-line import/no-extraneous-dependencies
import * as percy from 'percy-client';
import { run } from 'react-percy/lib/cli';

jest.mock('percy-client');

process.exit = jest.fn();

beforeAll(async () => {
    await run(['--config', 'webpack/webpack.config.js']);
});

it('uploads CSS files', () => {
    expect(percy.uploadResource.mock.calls).toMatchSnapshot();
});

it('creates snapshots for each test case', () => {
    expect(percy.createSnapshot.mock.calls).toMatchSnapshot();
});
