import PromisePool from 'es6-promise-pool';
import uploadResource from './uploadResource';

const concurrency = 2;

export default function uploadResources(percyClient, build, resources) {
    function* generatePromises() {
        for (const resource of resources) {
            yield uploadResource(percyClient, build, resource);
        }
    }

    const pool = new PromisePool(generatePromises(), concurrency);
    return pool.start();
}
