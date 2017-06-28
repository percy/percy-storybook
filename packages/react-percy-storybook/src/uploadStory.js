export default async function uploadStory(percyClient, build, story, widths, minimumHeight, assets, storyHtml) {
  try {
    const resource = percyClient.makeRootResource(story.name, storyHtml, story.encodedParams);

    const snapshotOptions = {
      name: story.name,
      widths,
      minimumHeight,
      enableJavaScript: true
    };

    const snapshot = await percyClient.createSnapshot(build, [resource], snapshotOptions);

    const missingResources = percyClient.getMissingResourceShas(snapshot);
    if (missingResources.length > 0) {
      await percyClient.uploadResources(build, [resource]);
    }

    await percyClient.finalizeSnapshot(snapshot, story.name);
  } catch (e) {
    e._percy = {
      story
    };
    throw e;
  }
}
