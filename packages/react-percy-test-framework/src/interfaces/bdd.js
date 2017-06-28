import getCommonInterface from './getCommonInterface';

export default function bdd(context, suites) {
  const common = getCommonInterface(suites);

  context.before = context.beforeAll = common.beforeAll;
  context.beforeEach = common.beforeEach;
  context.afterEach = common.afterEach;
  context.after = context.afterAll = common.afterAll;
  context.describe = common.suite;
  context.it = context.test = common.test;
}
