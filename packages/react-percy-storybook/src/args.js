export const docs = 'Documentation: https://percy.io/percy-storybook';

export const options = {
  widths: {
    alias: 'w',
    description: 'Comma seperated lists of widths',
    requiresArg: true
  },
  minimum_height: {
    description: 'Minimum height for the screenshot (integer)',
    requiresArg: true
  },
  debug: {
    alias: 'd',
    description: 'Debug mode',
    requiresArg: false
  },
  build_dir: {
    alias: 'b',
    description: 'Directory to load the static storybook built by build-storybook from',
    requiresArg: true
  },
  rtl: {
    description: 'Runs stories a second time with a direction parameter set to rtl',
    requiresArg: false
  },
  rtl_regex: {
    description: 'Runs stories with matching names a second time with direction param of rtl',
    requiresArg: true
  }
};

export const usage = 'Usage: $0 --widths=320,1280 --debug';
