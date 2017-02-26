import bdd from '../bdd';
import { __common } from '../getCommonInterface';

jest.mock('../getCommonInterface');

let context;

beforeEach(() => {
    context = {};

    bdd(context, [{ suite: true }]);
});

it('adds `before` to context', () => {
    expect(context.before).toBeDefined();
});

it('`before` adds beforeAll hook', () => {
    const hook = jest.fn();

    context.before(hook);

    expect(__common.beforeAll).toHaveBeenCalledWith(hook);
});

it('adds `beforeAll` to context', () => {
    expect(context.beforeAll).toBeDefined();
});

it('`beforeAll` adds beforeAll hook', () => {
    const hook = jest.fn();

    context.beforeAll(hook);

    expect(__common.beforeAll).toHaveBeenCalledWith(hook);
});

it('adds `beforeEach` to context', () => {
    expect(context.beforeEach).toBeDefined();
});

it('`beforeEach` adds beforeEach hook', () => {
    const hook = jest.fn();

    context.beforeEach(hook);

    expect(__common.beforeEach).toHaveBeenCalledWith(hook);
});

it('adds `afterEach` to context', () => {
    expect(context.afterEach).toBeDefined();
});

it('`afterEach` adds afterEach hook', () => {
    const hook = jest.fn();

    context.afterEach(hook);

    expect(__common.afterEach).toHaveBeenCalledWith(hook);
});

it('adds `after` to context', () => {
    expect(context.after).toBeDefined();
});

it('`after` adds afterAll hook', () => {
    const hook = jest.fn();

    context.after(hook);

    expect(__common.afterAll).toHaveBeenCalledWith(hook);
});

it('adds `afterAll` to context', () => {
    expect(context.afterAll).toBeDefined();
});

it('`afterAll` adds afterAll hook', () => {
    const hook = jest.fn();

    context.afterAll(hook);

    expect(__common.afterAll).toHaveBeenCalledWith(hook);
});

it('adds `describe` to context', () => {
    expect(context.describe).toBeDefined();
});

it('`describe` creates a new suite', () => {
    const title = 'suite';
    const callback = jest.fn();

    context.describe(title, callback);

    expect(__common.suite).toHaveBeenCalledWith(title, callback);
});

it('adds `it` to context', () => {
    expect(context.it).toBeDefined();
});

it('`it` creates a new test', () => {
    const title = 'test';
    const test = jest.fn();

    context.it(title, test);

    expect(__common.test).toHaveBeenCalledWith(title, test);
});

it('adds `test` to context', () => {
    expect(context.test).toBeDefined();
});

it('`test` creates a new test', () => {
    const title = 'test';
    const test = jest.fn();

    context.test(title, test);

    expect(__common.test).toHaveBeenCalledWith(title, test);
});
