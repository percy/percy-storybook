import jsdom from 'jsdom';

async function getStoriesFromDom(previewJavascriptCode) {
    return new Promise((resolve, reject) => {
        const jsDomConfig = {
            html: '',
            src: [previewJavascriptCode],
            done: (err, window) => {
                if (err) return reject(err.response.body);
                if (!window || !window.__storybook_stories__) {
                    return reject(new Error('Storybook object not found'));
                }
                resolve(window.__storybook_stories__);
            }
        };
        // parse preview bundle js code and retrieve window object
        jsdom.env(jsDomConfig);
    });
}

export default async function getStories(assets) {
    const previewJavascriptCode = assets[assets.keys()[0]];
    const stories = await getStoriesFromDom(previewJavascriptCode);
    return stories;
}
