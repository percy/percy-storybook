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
