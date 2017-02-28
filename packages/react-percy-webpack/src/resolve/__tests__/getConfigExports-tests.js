import getConfigExports from '../getConfigExports';

it('throws given no config', () => {
    expect(() => getConfigExports(null)).toThrow();
});

it('throws given array', () => {
    expect(() => getConfigExports([{
        config1: true
    }, {
        config2: true
    }])).toThrow();
});

it('returns ES5 config object', () => {
    const config = getConfigExports({
        config: true
    });

    expect(config).toEqual({
        config: true
    });
});

it('returns ES6 config object', () => {
    const config = getConfigExports({
        default: {
            config: true
        }
    });

    expect(config).toEqual({
        config: true
    });
});
