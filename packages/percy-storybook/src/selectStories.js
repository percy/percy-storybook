function storyMatchesRtlRegexAndIsNotExcluded(rtlRegex, storyName, options) {
  return rtlRegex && rtlRegex.test(storyName) && options.rtl !== false;
}

export default function selectStories(stories, rtlRegex) {
  let selectedStories = [];
  for (const group of stories) {
    for (const story of group.stories) {
      const options = story.options || {};
      if (!options.skip) {
        const name = `${group.kind}: ${story.name}`;
        const encodedParams =
          `selectedKind=${encodeURIComponent(group.kind)}` +
          `&selectedStory=${encodeURIComponent(story.name)}`;

        selectedStories.push({
          name,
          encodedParams,
          options: story.options,
        });
      }
    }
  }

  const rtlStories = [];
  for (const story of selectedStories) {
    const options = story.options || {};
    if (options.rtl || storyMatchesRtlRegexAndIsNotExcluded(rtlRegex, story.name, options)) {
      rtlStories.push({
        name: `${story.name} [RTL]`,
        encodedParams: `${story.encodedParams}&direction=rtl`,
        options: story.options,
      });
    }
  }

  return selectedStories.concat(rtlStories);
}
