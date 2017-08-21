import { EntryNames, RootElementId } from '@percy-io/react-percy-webpack';
import findEntryPath from './findEntryPath';

const getStylesheets = assets => Object.keys(assets).filter(name => /\.css$/.test(name));

export default function getHTML(assets) {
  const stylesheets = getStylesheets(assets);

  const scripts = [
    findEntryPath(assets, EntryNames.framework),
    findEntryPath(assets, EntryNames.snapshots),
    findEntryPath(assets, EntryNames.render),
  ];

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="utf-8">
      ${stylesheets.map(stylesheet => `<link rel="stylesheet" href="${stylesheet}" />`).join('\n')}
  </head>
  <body>
    <div id="${RootElementId}"></div>
    ${scripts.map(script => `<script type="text/javascript" src="${script}"></script>`).join('\n')}
  </body>
  </html>
  `;
}
