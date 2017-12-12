import uploadStories from './uploadStories';

export default async function uploadStorybook(
  client,
  selectedStories,
  widths,
  minimumHeight,
  storyHtml,
  assets,
  jsonOutput,
) {
  const snapshotPluralization = selectedStories.length === 1 ? 'snapshot' : 'snapshots';

  !jsonOutput &&
    // eslint-disable-next-line no-console
    console.log('\nUploading', selectedStories.length, snapshotPluralization, 'to Percy.');

  const resources = client.makeResources(assets);
  const build = await client.createBuild(resources);
  const missingResources = client.getMissingResources(build, resources);
  await client.uploadResources(build, missingResources);
  await uploadStories(client, build, selectedStories, widths, minimumHeight, assets, storyHtml);
  await client.finalizeBuild(build);

  if (jsonOutput) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(build.attributes));
  } else {
    // eslint-disable-next-line no-console
    console.log(
      'Percy snapshots uploaded. Visual diffs are now processing:',
      build.attributes['web-url'],
    );
  }
}
