import path from 'path';
import walk from 'walk';

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
const MAX_FILE_SIZE_BYTES = 15728640; // 15MB.

// Synchronously walk the build directory, read each file
function gatherBuildResources(buildDir) {
  const hashToResource = {};
  const walkOptions = {
    // Follow symlinks because many assets in the ember build directory are just symlinks.
    followLinks: true,

    listeners: {
      file(root, fileStats, next) {
        const absolutePath = path.join(root, fileStats.name);
        let resourceUrl = absolutePath;

        if (path.sep === '\\') {
          // Windows support: transform filesystem backslashes into forward-slashes for the URL.
          resourceUrl = resourceUrl.replace(/\\/g, '/');
        }

        // Strip the buildDir from the start of the resourceUrl
        if (buildDir.startsWith('./')) {
          resourceUrl = resourceUrl.replace(buildDir.substr(2), '');
        } else {
          resourceUrl = resourceUrl.replace(buildDir, '');
        }

        // Remove the leading /
        if (resourceUrl.charAt(0) === '/') {
          resourceUrl = resourceUrl.substr(1);
        }

        for (const assetPattern in SKIPPED_ASSETS) {
          if (resourceUrl.match(SKIPPED_ASSETS[assetPattern])) {
            next();
            return;
          }
        }

        // Skip large files.
        if (fs.statSync(absolutePath).size > MAX_FILE_SIZE_BYTES) {
          // eslint-disable-next-line no-console
          console.warn('\n[percy][WARNING] Skipping large file: ', resourceUrl);
          return;
        }

        // TODO(fotinakis): this is synchronous and potentially memory intensive, but we don't
        // keep a reference to the content around so this should be garbage collected. Re-evaluate?
        const content = fs.readFileSync(absolutePath);

        hashToResource[encodeURI(resourceUrl)] = content;
        next();
      },
    },
  };
  walk.walkSync(buildDir, walkOptions);

  return hashToResource;
}

export default function getStaticAssets(options = {}) {
  // Load iframe.html that is used for every snapshot asset
  const storyHtml = fs.readFileSync(options.iframePath, 'utf8');

  // Load build assets
  const assets = gatherBuildResources(options.buildDir);

  return { storyHtml, assets };
}
