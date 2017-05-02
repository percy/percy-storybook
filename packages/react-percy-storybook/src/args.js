export const docs = 'Documentation: https://percy.io/percy-storybook';

export const options = {
    widths: {
        alias: 'w',
        description: 'Comma seperated lists of strings.',
        requiresArg: false
    },
    ignore: {
        alias: 'i',
        description: 'Filepath regex Babel should ignore when loading. Default: node_modules',
        requiresArg: false
    }
};

export const usage = 'Usage: $0 --widths=320,1280';
