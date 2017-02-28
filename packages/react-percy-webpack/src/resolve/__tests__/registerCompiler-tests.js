import registerCompiler from '../registerCompiler';

let mockCompilers;

beforeEach(() => {
    jest.resetModules();
    mockCompilers = {};
});

const mockCompiler = (mockModule, options = {}) => {
    mockCompilers[mockModule] = {
        wasRequired: false,
        shouldThrow: options.shouldThrow,
        exports: {
            [mockModule]: 'mock'
        }
    };
    jest.mock(mockModule, () => {
        mockCompilers[mockModule].wasRequired = true;
        if (mockCompilers[mockModule].shouldThrow) {
            throw new Error();
        }
        return mockCompilers[mockModule].exports;
    }, { virtual: true });
};

const expectCompilerToHaveBeenRequired = (module) => {
    expect(mockCompilers[module].wasRequired).toBe(true);
};

const expectCompilerNotToHaveBeenRequired = (module) => {
    expect(mockCompilers[module].wasRequired).toBe(false);
};

const expectCompilerToHaveBeenRegistered = (module, register) => {
    expect(register).toHaveBeenCalledWith(mockCompilers[module].exports);
};

it('does nothing if compiler is null', () => {
    expect(() => registerCompiler(null)).not.toThrow();
});

it('requires compiler given string', () => {
    mockCompiler('foo-register');

    registerCompiler('foo-register');

    expectCompilerToHaveBeenRequired('foo-register');
});

it('requires compiler module and registers it given object', () => {
    const register = jest.fn();
    mockCompiler('foo-register');

    registerCompiler({
        module: 'foo-register',
        register
    });

    expectCompilerToHaveBeenRegistered('foo-register', register);
});

it('only requires first compiler given array of strings and first succeeds', () => {
    mockCompiler('foo-1-register');
    mockCompiler('foo-2-register');

    registerCompiler(['foo-1-register', 'foo-2-register']);

    expectCompilerToHaveBeenRequired('foo-1-register');
    expectCompilerNotToHaveBeenRequired('foo-2-register');
});

it('requires multiple compilers given array of strings and first fails', () => {
    mockCompiler('foo-1-register', { shouldThrow: true });
    mockCompiler('foo-2-register');

    registerCompiler(['foo-1-register', 'foo-2-register']);

    expectCompilerToHaveBeenRequired('foo-1-register');
    expectCompilerToHaveBeenRequired('foo-2-register');
});

it('only requires first compiler module and registers it given array of objects and first succeeds', () => {
    const registerFoo1 = jest.fn();
    const registerFoo2 = jest.fn();
    mockCompiler('foo-1-register');
    mockCompiler('foo-2-register');

    registerCompiler([{
        module: 'foo-1-register',
        register: registerFoo1
    }, {
        module: 'foo-2-register',
        register: registerFoo2
    }]);

    expectCompilerToHaveBeenRegistered('foo-1-register', registerFoo1);
    expectCompilerNotToHaveBeenRequired('foo-2-register');
});

it('requires multiple compiler modules and registers them given array of objects and first fails', () => {
    const registerFoo1 = jest.fn(() => { throw new Error(); });
    const registerFoo2 = jest.fn();
    mockCompiler('foo-1-register');
    mockCompiler('foo-2-register');

    registerCompiler([{
        module: 'foo-1-register',
        register: registerFoo1
    }, {
        module: 'foo-2-register',
        register: registerFoo2
    }]);

    expectCompilerToHaveBeenRegistered('foo-1-register', registerFoo1);
    expectCompilerToHaveBeenRegistered('foo-2-register', registerFoo2);
});
