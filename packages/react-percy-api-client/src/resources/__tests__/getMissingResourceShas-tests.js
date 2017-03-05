import getMissingResourceShas from '../getMissingResourceShas';

it('returns an empty list given empty build', () => {
    const build = null;

    const shas = getMissingResourceShas(build);

    expect(shas).toEqual([]);
});

it('returns an empty list given no relationships', () => {
    const build = {};

    const shas = getMissingResourceShas(build);

    expect(shas).toEqual([]);
});

it('returns an empty list given no missing resources', () => {
    const build = {
        relationships: {
            'missing-resources': {}
        }
    };

    const shas = getMissingResourceShas(build);

    expect(shas).toEqual([]);
});

it('returns missing resource shas given missing resources', () => {
    const build = {
        relationships: {
            'missing-resources': {
                data: [{
                    id: '35hh645u456u'
                }, {
                    id: '65r56745yt45'
                }]
            }
        }
    };

    const shas = getMissingResourceShas(build);

    expect(shas).toEqual([
        '35hh645u456u',
        '65r56745yt45'
    ]);
});
