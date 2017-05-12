export const docs = 'Documentation: https://percy.io/percy-storybook';

export const options = {
    widths: {
        alias: 'w',
        description: 'Comma seperated lists of strings.',
        requiresArg: true
    },
    debug: {
        alias: 'd',
        description: 'Debug mode',
        requiresArg: false
    }
};

export const usage = 'Usage: $0 --widths=320,1280 --debug';
