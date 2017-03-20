// eslint-disable-next-line import/no-extraneous-dependencies
import * as percy from 'percy-client';
import { run } from 'react-percy/lib/cli';

jest.mock('percy-client');

process.exit = jest.fn();

it('uploads assets', async () => {
    await run(['--config', 'webpack/webpack.config.js']);

    expect(percy.uploadResource.mock.calls).toMatchSnapshot();
});
