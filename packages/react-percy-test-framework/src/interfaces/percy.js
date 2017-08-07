import getCommonInterface from './getCommonInterface';

export default function percy(context, suites) {
  const common = getCommonInterface(suites);

  context.before = context.beforeAll = common.beforeAll;
  context.beforeEach = common.beforeEach;
  context.afterEach = common.afterEach;
  context.after = context.afterAll = common.afterAll;
  context.percySnapshot = common.snapshot;
  context.suite = common.suite;
}
