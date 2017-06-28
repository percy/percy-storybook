import selectStories from '../selectStories';

it('returns empty array for an empty array', () => {
  expect(selectStories([])).toEqual([]);
});

it('returns expected selected stories for a stories array', () => {
  const stories = [
    {
      kind: 'ImagePost',
      stories: [
                 { name: 'a' },
                 { name: 'b' }
      ]
    },
    {
      kind: 'LinkPost',
      stories: [
               { name: 'a' },
               { name: 'b' }
      ]
    }
  ];

  const expectedSelectedStories = [
    {
      encodedParams: 'selectedKind=ImagePost&selectedStory=a',
      name: 'ImagePost: a'
    },
    {
      encodedParams: 'selectedKind=ImagePost&selectedStory=b',
      name: 'ImagePost: b'
    },
    {
      encodedParams: 'selectedKind=LinkPost&selectedStory=a',
      name: 'LinkPost: a'
    },
    {
      encodedParams: 'selectedKind=LinkPost&selectedStory=b',
      name: 'LinkPost: b'
    }
  ];

  expect(selectStories(stories)).toEqual(expectedSelectedStories);
});

it('ads rtl stories when requested', () => {
  const stories = [
    {
      kind: 'ImagePost',
      stories: [
                 { name: 'a' },
                 { name: 'b' }
      ]
    }
  ];

  const expectedSelectedStories = [
    {
      encodedParams: 'selectedKind=ImagePost&selectedStory=a',
      name: 'ImagePost: a'
    },
    {
      encodedParams: 'selectedKind=ImagePost&selectedStory=b',
      name: 'ImagePost: b'
    },
    {
      encodedParams: 'selectedKind=ImagePost&selectedStory=a&direction=rtl',
      name: 'ImagePost: a [RTL]'
    },
    {
      encodedParams: 'selectedKind=ImagePost&selectedStory=b&direction=rtl',
      name: 'ImagePost: b [RTL]'
    }
  ];

  expect(selectStories(stories, /.*/gim)).toEqual(expectedSelectedStories);
});
