import uploadResource from '../uploadResource';
import uploadResources from '../uploadResources';

jest.mock('../uploadResource', () => jest.fn(() => Promise.resolve()));

let percyClient;

beforeEach(() => {
    percyClient = {};
});

it('uploads the specified resources', async () => {
    const build = { id: '123' };
    const resources = [{
        resourceUrl: '/a',
        content: 'a'
    }, {
        resourceUrl: '/b',
        content: 'b'
    }, {
        resourceUrl: '/c',
        content: 'c'
    }];

    await uploadResources(percyClient, build, resources);

    resources.forEach(resource =>
        expect(uploadResource).toHaveBeenCalledWith(percyClient, build, resource)
    );
});
