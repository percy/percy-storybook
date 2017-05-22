import uploadStories from './uploadStories';

export default async function uploadStorybook(client, selectedStories, widths, storyHtml, assets) {
    const snapshotPluralization = selectedStories.length === 1 ? 'snapshot' : 'snapshots';
    // eslint-disable-next-line no-console
    console.log('\nUploading', selectedStories.length, snapshotPluralization, 'to Percy.');

    const resources = client.makeResources(assets);
    const build = await client.createBuild(resources);
    const missingResources = client.getMissingResources(build, resources);
    await client.uploadResources(build, missingResources);
    await uploadStories(client, build, selectedStories, widths, assets, storyHtml);
    await client.finalizeBuild(build);

    // eslint-disable-next-line no-console
    console.log('Percy snapshots uploaded. Visual diffs are now processing:', build.attributes['web-url']);
}
