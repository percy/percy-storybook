import resolve from '../';

const mockConfig = { config: true };
jest.mock('../requireWebpackConfig');
jest.mock('../getWebpackConfigExports', () => () => mockConfig);

it('returns the webpack config', () => {
    const config = resolve('webpack.config.js');

    expect(config).toEqual(mockConfig);
});
