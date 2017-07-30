import getExtension from '../getExtension';

jest.mock('interpret', () => ({
  extensions: {
    '.babel.js': null,
    '.coffee': null,
    '.js': null,
  },
}));

it('returns multipart JS file extension when mapped by interpret', () => {
  const extension = getExtension('webpack.config.babel.js');

  expect(extension).toEqual('.babel.js');
});

it('returns JS when multipart JS file extension not mapped by interpret', () => {
  const extension = getExtension('webpack.config.foo.js');

  expect(extension).toEqual('.js');
});

it('returns custom file extension', () => {
  const extension = getExtension('webpack.config.coffee');

  expect(extension).toEqual('.coffee');
});

it('returns JS given default config name', () => {
  const extension = getExtension('webpack.config.js');

  expect(extension).toEqual('.js');
});
