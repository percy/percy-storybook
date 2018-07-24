const fs = require('fs');

// Some build assets we never want to upload.
const SKIPPED_ASSETS = [
  'index.html',
  'iframe.html',
  'favicon.ico',
  'static/manager.*.bundle.js',
  /\.map$/,
  /\.log$/,
  /\.DS_Store$/,
];

export default function getStaticAssets(percyClient, options = {}) {
  // Load iframe.html that is used for every snapshot asset
  const storyHtml = fs.readFileSync(options.iframePath, 'utf8');

  const buildOutputDirectory = options.buildDir;
  const baseUrlPath = '';

  // Load build assets
  var assets = percyClient.gatherBuildResources(buildOutputDirectory, {
    baseUrlPath: baseUrlPath,
    skippedPathRegexes: SKIPPED_ASSETS,
  });

  return { storyHtml, assets };
}
