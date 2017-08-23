import percySnapshotLoader from '../percySnapshotLoader';

it('prepends ESLint comment whitelisting Percy globals to source code', () => {
  const webpack = {
    callback: jest.fn(),
  };
  const source = `import foo from './bar';`;
  const map = { mock: 'source map' };

  percySnapshotLoader.call(webpack, source, map);

  const transformedSource = webpack.callback.mock.calls[0][1];
  expect(transformedSource).toMatchSnapshot();
});
