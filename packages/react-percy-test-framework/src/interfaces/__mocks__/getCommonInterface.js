export const __common = {
  beforeAll: jest.fn(),
  beforeEach: jest.fn(),
  afterEach: jest.fn(),
  afterAll: jest.fn(),
  suite: jest.fn(),
  test: jest.fn()
};

export default () => __common;
