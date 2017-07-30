import { getMissingResourceShas, makeRootResource, uploadResources } from '../resources';
import createSnapshot from './createSnapshot';
import finalizeSnapshot from './finalizeSnapshot';

export default async function runSnapshot(percyClient, build, testCase, assets, renderer) {
  try {
    const html = renderer(testCase.markup, assets);
    const resource = makeRootResource(percyClient, testCase.name, html);

    let widths = [];
    if (testCase.sizes) {
      widths = testCase.sizes.map(size => size.width);
    }

    const snapshotOptions = {
      name: testCase.name,
      widths,
    };

    const snapshot = await createSnapshot(percyClient, build, [resource], snapshotOptions);

    const missingResources = getMissingResourceShas(snapshot);
    if (missingResources.length > 0) {
      await uploadResources(percyClient, build, [resource]);
    }

    await finalizeSnapshot(percyClient, snapshot, testCase.name);
  } catch (e) {
    e._percy = {
      testCase,
    };
    throw e;
  }
}
