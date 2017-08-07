export default class MockSuite {
  addBeforeAll = jest.fn();
  addBeforeEach = jest.fn();
  addAfterEach = jest.fn();
  addAfterAll = jest.fn();
  addSuite = jest.fn();
  addSnapshot = jest.fn();
}
