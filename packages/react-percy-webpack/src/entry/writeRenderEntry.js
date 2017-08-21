import fs from 'fs';
import { GlobalVariables, RootElementId } from './constants';

export default function writeRenderEntry(percyConfig, filePath, resolver = require.resolve) {
  fs.writeFileSync(
    filePath,
    `
    const url = require("url");
    const renderer = require("${resolver(percyConfig.renderer)}");

    const render = renderer.default || renderer;

    const rootSuite = window["${GlobalVariables.rootSuite}"];

    const parsedUrl = url.parse(window.location.href, true);
    const snapshotName = parsedUrl.query.snapshot;

    const rootEl = document.getElementById("${RootElementId}");

    rootSuite.getSnapshotMarkup(snapshotName)
      .then(markup => render(markup, rootEl));
  `,
  );
}
