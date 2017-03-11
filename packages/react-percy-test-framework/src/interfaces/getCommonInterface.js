import Suite from '../Suite';
import Test from '../Test';

export default function getCommonInterface(suites) {
    return {
        beforeAll(fn) {
            suites[0].addBeforeAll(fn);
        },
        beforeEach(fn) {
            suites[0].addBeforeEach(fn);
        },
        afterEach(fn) {
            suites[0].addAfterEach(fn);
        },
        afterAll(fn) {
            suites[0].addAfterAll(fn);
        },
        async suite(title, fn, sizes) {
            const suite = new Suite(title, sizes);
            suites[0].addSuite(suite);
            suites.unshift(suite);
            if (typeof fn === 'function') {
                await fn.call(suite);
            } else {
                throw new Error(`Suite "${suite.fullTitle()}" was defined but no callback was supplied.`);
            }
            suites.shift();
            return suite;
        },
        test(title, fn, sizes) {
            const test = new Test(title, fn, sizes);
            suites[0].addTest(test);
            return test;
        }
    };
}
