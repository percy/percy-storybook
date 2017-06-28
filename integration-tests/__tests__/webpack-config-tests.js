// eslint-disable-next-line import/no-extraneous-dependencies
import * as percy from 'percy-client';
import { run } from '@percy-io/react-percy/lib/cli';

jest.mock('percy-client');

process.exit = jest.fn();

it('handles ES6 webpack configs', async () => {
  await run(['--config', 'webpack/webpack.config.babel.js']);

  expect(percy.createSnapshot).toHaveBeenCalledTimes(2);
});
