import uploadStory from '../uploadStory';
import uploadStories from '../uploadStories';

jest.mock('../uploadStory', () => jest.fn(() => Promise.resolve()));

it('uploads stories for each test case', async () => {
  const percyClient = {};
  const build = {};
  const assets = {};
  const stories = [
        { name: 'story 1' },
        { name: 'story 2' }
  ];
  const storyHtml = '<html></html>';

  await uploadStories(percyClient, build, stories, [328, 768], 100, assets, storyHtml);

  stories.forEach(story =>
        expect(uploadStory).toHaveBeenCalledWith(percyClient, build, story, [328, 768], 100, assets, storyHtml)
    );
});
