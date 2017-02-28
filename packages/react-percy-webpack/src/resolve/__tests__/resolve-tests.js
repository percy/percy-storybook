import resolve from '../';

const mockConfig = { config: true };
jest.mock('../requireConfig');
jest.mock('../getConfigExports', () => () => mockConfig);

it('returns the webpack config', () => {
    const config = resolve('webpack.config.js');

    expect(config).toEqual(mockConfig);
});
