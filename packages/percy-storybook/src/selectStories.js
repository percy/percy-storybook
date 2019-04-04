import ExtendableError from 'es6-error';

export class InvalidOptionError extends ExtendableError {}

function assertWidths(widths) {
  if (typeof widths === 'undefined') {
    return;
  }
  if (!Array.isArray(widths)) {
    throw new InvalidOptionError("Given widths option '" + widths + "' is not an array");
  }
  if (!widths.length) {
    throw new InvalidOptionError('Need at least one valid width');
  }
  widths.forEach(width => {
    if (isNaN(width) || width !== ~~width) {
      throw new InvalidOptionError("Given width '" + width + "' is invalid");
    }
  });
}

function assertRtl(rtl) {
  if (typeof rtl === 'undefined') {
    return;
  }
  if (typeof rtl !== 'boolean') {
    throw new InvalidOptionError("Given rtl option '" + rtl + "' is invalid");
  }
}

function assertSkip(skip) {
  if (typeof skip === 'undefined') {
    return;
  }
  if (typeof skip !== 'boolean') {
    throw new InvalidOptionError("Given skip option '" + skip + "' is invalid");
  }
}

function storyMatchesRtlRegexAndIsNotExcluded(rtlRegex, storyName, options) {
  return rtlRegex && rtlRegex.test(storyName) && options.rtl !== false;
}

export default function selectStories(rawStories, rtlRegex) {
  let selectedStories = [];
  Object.values(rawStories).forEach(story => {
    let options = {};
    if (story.parameters && story.parameters.percy) {
      options = story.parameters.percy;
      assertWidths(options.widths);
      assertRtl(options.rtl);
      assertSkip(options.skip);
    }
    if (!options.skip) {
      const name = `${story.kind}: ${story.name}`;
      const encodedParams =
        `selectedKind=${encodeURIComponent(story.kind)}` +
        `&selectedStory=${encodeURIComponent(story.name)}`;

      selectedStories.push({
        name,
        encodedParams,
        options,
      });
    }
  });

  // Iterate through selected stories and add RTL versions when requested
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
