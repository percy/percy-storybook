import jsdom from 'jsdom';

function getStoriesFromDom(previewJavascriptCode) {
    return new Promise((resolve, reject) => {
        const jsDomConfig = {
            html: '',
            src: [previewJavascriptCode],
            done: (err, window) => {
                if (err) return reject(err.response.body);
                if (!window || !window.__storybook_stories__) {
                    reject(new Error('Storybook object not found on window.'));
                }
                resolve(window.__storybook_stories__);
            }
        };
        // parse preview bundle js code and retrieve window object
        jsdom.env(jsDomConfig);
    });
}

export default async function getStories(assets) {
    if (!assets) throw new Error('Preview asset was not received.');
    if (Object.keys(assets).length !== 1) throw new Error('Expected to receive only 1 asset');

    // TODO: Assumes assets has just one key, that contains the preview.js.  Tidy this.
    const previewJavascriptCode = assets[Object.keys(assets)[0]];
    const stories = await getStoriesFromDom(previewJavascriptCode);
    return stories;
}
