import PromisePool from 'es6-promise-pool';
import runSnapshot from './runSnapshot';

const concurrency = 5;

export default function runSnapshots(percyClient, build, testCases, assets, renderer) {
  function* generatePromises() {
    for (const testCase of testCases) {
      yield runSnapshot(percyClient, build, testCase, assets, renderer);
    }
  }

  const pool = new PromisePool(generatePromises(), concurrency);
  return pool.start();
}
