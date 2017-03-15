import resolve from '../';

const mockConfig = { config: true };
jest.mock('../requireWebpackConfig');
jest.mock('../getWebpackConfigExports', () => config => config);
jest.mock('../../entry', () => ({
    configureVirtualEntry: () => mockConfig
}));

it('returns the webpack config with the virtual entry set up', () => {
    const config = resolve('webpack.config.js');

    expect(config).toEqual(mockConfig);
});
