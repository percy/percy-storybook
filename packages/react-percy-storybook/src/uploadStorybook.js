import uploadStories from './uploadStories';

export default async function uploadStorybook(client, selectedStories, widths, storyHtml, assets) {
    const resources = client.makeResources(assets);
    const build = await client.createBuild(resources);
    const missingResources = client.getMissingResources(build, resources);
    await client.uploadResources(build, missingResources);
    await uploadStories(client, build, selectedStories, widths, assets, storyHtml);
    await client.finalizeBuild(build);
}
