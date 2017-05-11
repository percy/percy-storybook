import getStories from '../getStories';

it('raises an error when called with an empty object', async () => {
    try {
        await getStories();
    } catch (e) {
        expect(e).toEqual(new Error('Preview asset was not received.'));
    }

    expect.assertions(1);
});

it('returns an empty array when no stories loaded', async () => {
    const code = '<html></html>';
    const assets = { code };

    try {
        await getStories(assets);
    } catch (e) {
        expect(e).toEqual(new Error('Storybook object not found on window.'));
    }

    expect.assertions(1);
});

it('returns the value __storybook_stories__ is set to', async () => {
    const code = 'if (typeof window === \'object\') window.__storybook_stories__ = \'hi\';';
    const assets = { code };

    const stories = await getStories(assets);
    expect(stories).toEqual('hi');
});
