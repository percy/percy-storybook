import getMissingResourceShas from './getMissingResourceShas';

function toHashMap(resources) {
    const hashMap = {};

    resources.forEach((resource) => {
        hashMap[resource.sha] = resource;
    });

    return hashMap;
}

export default function getMissingResources(build, resources) {
    const shas = getMissingResourceShas(build);
    const resourceHash = toHashMap(resources);

    return shas.map(sha => resourceHash[sha]);
}
