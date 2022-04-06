import { SpecReporter } from 'jasmine-spec-reporter';

// in some tests, storybook takes a little while to start
jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

jasmine.getEnv().clearReporters();
jasmine.getEnv().addReporter(
  new SpecReporter({
    spec: { displayPending: true },
    summary: { displayPending: false }
  })
);

if (process.env.DUMP_FAILED_TEST_LOGS) {
  // add a spec reporter to dump failed logs
  jasmine.getEnv().addReporter({
    specDone: async ({ status }) => {
      if (status === 'failed') {
        let helpers = await import('@percy/cli-command/test/helpers');
        helpers.logger.dump();
      }
    }
  });
}
