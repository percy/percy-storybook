import run from '@percy-io/react-percy-ci';

export default function runPercy(percyConfig, webpackConfig, percyToken) {
    // Eventually this will switch to running the local dev-server when not in CI
  return run(percyConfig, webpackConfig, percyToken);
}
