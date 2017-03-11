import { renderToStaticMarkup } from 'react-dom/server';

function getStylesheets(assets) {
    return Object.keys(assets).filter(name => /\.css$/.test(name));
}

export default function render(markup, assets) {
    const body = renderToStaticMarkup(markup);

    const stylesheets = getStylesheets(assets);

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        ${stylesheets.map(stylesheet => `<link rel="stylesheet" href="/${stylesheet}" />`).join('\n')}
    </head>
    <body>${body}</body>
    </html>
    `;
}
