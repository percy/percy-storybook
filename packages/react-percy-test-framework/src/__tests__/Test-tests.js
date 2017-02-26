import React from 'react';
import Test from '../Test';

jest.mock('../normalizeSizes', () => sizes => sizes);

describe('constructor', () => {

    it('throws when no title or function is specified', () => {
        expect(() => new Test()).toThrow();
    });

    it('throws when no title is specified', () => {
        expect(() => new Test(() => {})).toThrow();
    });

});

describe('getTestCase', () => {

    it('sets name to title given no parent', () => {
        const test = new Test('title', () => {});

        const testCase = test.getTestCase();

        expect(testCase.name).toEqual('title');
    });

    it('sets name to title given parent with no title', () => {
        const test = new Test('title', () => {});
        test.parent = {
            fullTitle: () => '',
            getSizes: () => []
        };

        const testCase = test.getTestCase();

        expect(testCase.name).toEqual('title');
    });

    it('sets name to combined title given parent with title', () => {
        const test = new Test('title', () => {});
        test.parent = {
            fullTitle: () => 'parent title',
            getSizes: () => []
        };

        const testCase = test.getTestCase();

        expect(testCase.name).toEqual('parent title - title');
    });

    it('sets markup to the result of the test function', () => {
        const markup = <div>Test</div>;
        const test = new Test('title', () => markup);

        const testCase = test.getTestCase();

        expect(testCase.markup).toEqual(markup);
    });

    it('sets sizes to an empty array given no sizes specified and no parent', () => {
        const test = new Test('title', () => {});

        const testCase = test.getTestCase();

        expect(testCase.sizes).toEqual([]);
    });

    it('sets sizes to parent sizes given no sizes specified', () => {
        const test = new Test('title', () => {});
        test.parent = {
            fullTitle: () => '',
            getSizes: () => [320, 768]
        };

        const testCase = test.getTestCase();

        expect(testCase.sizes).toEqual([320, 768]);
    });

    it('sets sizes to sizes specified on test, ignoring parent sizes', () => {
        const test = new Test('title', () => {}, [500, 1024]);
        test.parent = {
            fullTitle: () => '',
            getSizes: () => [320, 768]
        };

        const testCase = test.getTestCase();

        expect(testCase.sizes).toEqual([500, 1024]);
    });

});
