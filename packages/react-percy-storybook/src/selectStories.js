export default function selectStories(stories, rtlRegex) {
  let selectedStories = [];
  for (const group of stories) {
    for (const story of group.stories) {
      const name = `${group.kind}: ${story.name}`;
      const encodedParams = `selectedKind=${encodeURIComponent(group.kind)}` +
                `&selectedStory=${encodeURIComponent(story.name)}`;

      selectedStories.push({
        name,
        encodedParams
      });
    }
  }

  if (rtlRegex) {
    const rtlStories = [];
    for (const story of selectedStories) {
      if (story.name.match(rtlRegex)) {
        rtlStories.push({
          name: `${story.name} [RTL]`,
          encodedParams: `${story.encodedParams}&direction=rtl`
        });
      }
    }
    selectedStories = selectedStories.concat(rtlStories);
  }

  return selectedStories;
}
