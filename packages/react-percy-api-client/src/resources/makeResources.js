import { lookup } from 'mime-types';

const IGNORE = [
    /\.html$/,
    /\.js$/,
    /\.map$/
];

function filterAssetPaths(assetPaths) {
    return assetPaths.filter((assetPath) => {
        for (const pattern of IGNORE) {
            if (pattern.test(assetPath)) {
                return false;
            }
        }
        return true;
    });
}

export default function makeResources(percyClient, assets) {
    const assetPaths = Object.keys(assets);
    const filteredAssetPaths = filterAssetPaths(assetPaths);
    return filteredAssetPaths.map(assetPath =>
        percyClient.makeResource({
            resourceUrl: `/${assetPath}`,
            mimetype: lookup(assetPath),
            content: assets[assetPath]
        })
    );
}
