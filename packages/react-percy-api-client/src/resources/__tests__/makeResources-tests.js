import makeResources from '../makeResources';

let percyClient;

beforeEach(() => {
    percyClient = {
        makeResource: data => data
    };
});

it('does create resources for JS files', () => {
    const assets = {
        'main.js': { foo: () => {} }
    };

    const resources = makeResources(percyClient, assets);

    expect(resources[0].resourceUrl).toEqual('/main.js');
});

it('does not create resources for HTML files', () => {
    const assets = {
        'main.html': '<html><body>Foo</body></html>'
    };

    const resources = makeResources(percyClient, assets);

    expect(resources).toEqual([]);
});

it('does not create resources for source maps', () => {
    const assets = {
        'main.map': '{"version":"5"}'
    };

    const resources = makeResources(percyClient, assets);

    expect(resources).toEqual([]);
});

it('creates resources for CSS files', () => {
    const assets = {
        'main.css': '.foo { background: red; }'
    };

    const resources = makeResources(percyClient, assets);

    expect(resources).toHaveLength(1);
});

it('sets the resource URL to a slash prefixed path to the asset', () => {
    const assets = {
        'main.css': '.foo { background: red; }'
    };

    const resources = makeResources(percyClient, assets);

    expect(resources).toEqual([
        expect.objectContaining({
            resourceUrl: '/main.css'
        })
    ]);
});

it('sets the mime type for assets', () => {
    const assets = {
        'main.css': '.foo { background: red; }'
    };

    const resources = makeResources(percyClient, assets);

    expect(resources).toEqual([
        expect.objectContaining({
            mimetype: 'text/css'
        })
    ]);
});

it('sets content to the contents of the asset', () => {
    const assets = {
        'main.css': '.foo { background: red; }'
    };

    const resources = makeResources(percyClient, assets);

    expect(resources).toEqual([
        expect.objectContaining({
            content: '.foo { background: red; }'
        })
    ]);
});
