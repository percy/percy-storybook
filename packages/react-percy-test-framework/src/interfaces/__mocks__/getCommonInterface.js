export const __common = {
  beforeAll: jest.fn(),
  beforeEach: jest.fn(),
  afterEach: jest.fn(),
  afterAll: jest.fn(),
  snapshot: jest.fn(),
  suite: jest.fn(),
};

export default () => __common;
