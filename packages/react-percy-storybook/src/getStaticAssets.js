import path from 'path';

const fs = require('fs');

export default function getStaticAssets(options = {}) {
    const storybookStaticPath = path.resolve(options.buildDir);
    const storyHtml = fs.readFileSync(path.join(storybookStaticPath, 'iframe.html'), 'utf8');

    const storybookJavascriptPath = storyHtml.match(/<script src="(.*?static\/preview.*?)"><\/script>/)[1];
    const storyJavascript = fs.readFileSync(path.join(storybookStaticPath, storybookJavascriptPath), 'utf8');

    const assets = {};
    assets[storybookJavascriptPath] = storyJavascript;

    return { storyHtml, assets };
}
