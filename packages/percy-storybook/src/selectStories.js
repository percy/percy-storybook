import ExtendableError from 'es6-error';
import storybookVersion from './storybookVersion';

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
    throw new InvalidOptionError(`Given rtl option '${rtl}' is invalid`);
  }
}

function assertSkip(skip) {
  if (typeof skip === 'undefined') {
    return;
  }
  if (typeof skip !== 'boolean') {
    throw new InvalidOptionError(`Given skip option '${skip}' is invalid`);
  }
}

function assertMinimumHeight(minHeight) {
  if (typeof minHeight === 'undefined') {
    return;
  }
  if (typeof minHeight !== 'number') {
    throw new InvalidOptionError(`Given minHeight option ${minHeight} is invalid`);
  }
}

function storyMatchesRtlRegexAndIsNotExcluded(rtlRegex, storyName, options) {
  return rtlRegex && rtlRegex.test(storyName) && options.rtl !== false;
}

function useStoryId() {
  if (typeof useStoryId.cached === 'boolean') {
    return useStoryId.cached;
  }

  // ignore alpha, beta, and rc versions
  const version = storybookVersion().split('-')[0];
  const [major, minor] = version
    .replace('v', '')
    .split('.')
    .map(Number);

  // use story ID in storybook >= 5.3.x
  const result = major >= 5 && minor >= 3;
  useStoryId.cached = result;
  return result;
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
      assertMinimumHeight(options.minHeight);
    }
    if (!options.skip) {
      const name = `${story.kind}: ${story.name}`;
      const encodedParams = useStoryId()
        ? `id=${story.id}`
        : `selectedKind=${encodeURIComponent(story.kind)}` +
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
