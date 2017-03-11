import { getMissingResourceShas, makeRootResource, uploadResources } from '../resources';
import createSnapshot from './createSnapshot';
import finalizeSnapshot from './finalizeSnapshot';

export default async function runSnapshot(percyClient, build, testCase, assets, renderer) {
    try {
        const html = renderer(testCase.markup, assets);
        const resource = makeRootResource(percyClient, testCase.name, html);

        const snapshot = await createSnapshot(percyClient, build, testCase.name, resource, testCase.sizes);

        const missingResources = getMissingResourceShas(snapshot);
        if (missingResources.length > 0) {
            await uploadResources(percyClient, build, [resource]);
        }

        await finalizeSnapshot(percyClient, snapshot, testCase.name);
    } catch (e) {
        e._percy = {
            testCase
        };
        throw e;
    }

}
