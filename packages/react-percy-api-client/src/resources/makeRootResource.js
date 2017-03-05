import slugify from 'slugify';

export default function makeRootResource(percyClient, testName, html) {
    return percyClient.makeResource({
        resourceUrl: `/${slugify(testName).toLowerCase()}.html`,
        content: html,
        isRoot: true,
        mimetype: 'text/html'
    });
}
