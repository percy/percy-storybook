export default function getMissingResourceShas(build) {
    if (!build) {
        return [];
    }

    if (!build.relationships) {
        return [];
    }

    if (!build.relationships['missing-resources']) {
        return [];
    }

    if (!build.relationships['missing-resources'].data) {
        return [];
    }

    return build.relationships['missing-resources'].data.map(resource => resource.id);
}
