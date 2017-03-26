import React from 'react';
import render from '../';

it('renders markup in the HTML body', () => {
    const markup = <div>My Component</div>;
    const assets = {
        'foo.css': '.foo { background: red; }'
    };

    const html = render(markup, assets);

    expect(html).toContain('<body><div>My Component</div></body>');
});

it('adds all external stylesheets to the HTML head', () => {
    const markup = <div>My Component</div>;
    const assets = {
        'foo.css': '.foo { background: red; }',
        'bar.css': '.bar { background: blue; }'
    };

    const html = render(markup, assets);

    expect(html).toContain('<link rel="stylesheet" href="/foo.css" />');
    expect(html).toContain('<link rel="stylesheet" href="/bar.css" />');
});

it('does not add non-CSS assets to the HTML', () => {
    const markup = <div>My Component</div>;
    const assets = {
        'foo.css': '.foo { background: red; }',
        'foo.js': 'module.exports = 1;',
        'foo.svg': '<svg></svg>'
    };

    const html = render(markup, assets);

    expect(html).not.toContain('foo.js');
    expect(html).not.toContain(assets['foo.js']);
    expect(html).not.toContain('foo.svg');
    expect(html).not.toContain(assets['foo.svg']);
});
