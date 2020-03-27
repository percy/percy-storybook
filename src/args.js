export const docs = 'Documentation: https://percy.io/percy-storybook';

export const options = {
  fail_on_empty: {
    description: 'Fail when no stories are found',
    requiresArg: true,
  },
  widths: {
    alias: 'w',
    description: 'Comma seperated lists of widths',
    requiresArg: true,
  },
  minimum_height: {
    description: 'Minimum height for the screenshot (integer)',
    requiresArg: true,
  },
  debug: {
    alias: 'd',
    description: 'Debug mode',
    requiresArg: false,
  },
  build_dir: {
    alias: 'b',
    description: 'Directory to load the static storybook built by build-storybook from',
    requiresArg: true,
  },
  output_format: {
    description: 'Specify JSON to log the build parameters in JSON. Note: --debug outputs non-JSON',
    requiresArg: true,
  },
  rtl: {
    description: 'Runs stories a second time with a direction parameter set to rtl',
    requiresArg: false,
  },
  rtl_regex: {
    description: 'Runs stories with matching names a second time with direction param of rtl',
    requiresArg: true,
  },
  puppeteer_launch_retries: {
    description: 'Number of times to attempt to launch puppeteer',
    requiresArg: true,
  }
};

export const usage = 'Usage: $0 --widths=320,1280 --debug';
