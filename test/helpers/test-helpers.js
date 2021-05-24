const { SpecReporter } = require('jasmine-spec-reporter');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1200000;

jasmine.getEnv().clearReporters();
jasmine.getEnv().addReporter(
  new SpecReporter({
    spec: { displayPending: true },
    summary: { displayPending: false }
  })
);
