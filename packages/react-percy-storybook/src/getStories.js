import jsdom from 'jsdom';

// jsdom doesn't support Web Workers yet.
// We use workerMock to allow the user's preview.js to interact with the Worker API.
const workerMock = `
    function MockWorker(path) {
      var api = this;

      function addEventListener() {}
      function removeEventListener() {}
      function postMessage() {}
      function terminate() {}

      api.postMessage = postMessage;
      api.addEventListener = addEventListener;
      api.removeEventListener = removeEventListener;
      api.terminate = terminate;

      return api;
    }
    window.Worker = MockWorker;
`;


// jsdom doesn't support localStorage yet.
// We use localStorageMock to allow the user's preview.js to interact with localStorage.
const localStorageMock = `
    var localStorageMock = (function() {
      var store = {};
      return {
        getItem: function(key) {
          return store[key];
        },
        setItem: function(key, value) {
          store[key] = value.toString();
        },
        clear: function() {
          store = {};
        }
      };
    })();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    `;

function getStoriesFromDom(previewJavascriptCode, options) {
    return new Promise((resolve, reject) => {
        const jsDomConfig = {
            html: '',
            url: 'https://example.com/iframe.js?selectedKind=none&selectedStory=none',
            src: [workerMock, localStorageMock, previewJavascriptCode],
            done: (err, window) => {
                if (err) return reject(err.response.body);
                if (!window || !window.__storybook_stories__) {
                    reject(new Error('Storybook object not found on window.'));
                }
                resolve(window.__storybook_stories__);
            }
        };
        if (options.debug) {
            jsDomConfig.virtualConsole = jsdom.createVirtualConsole().sendTo(console);
        }
        jsdom.env(jsDomConfig);
    });
}

export default async function getStories(assets, options = {}) {
    if (!assets) throw new Error('Preview asset was not received.');
    if (Object.keys(assets).length !== 1) throw new Error('Expected to receive only 1 asset');

    // TODO: Assumes assets has just one key, that contains the preview.js.  Tidy this.
    const previewJavascriptCode = assets[Object.keys(assets)[0]];
    const stories = await getStoriesFromDom(previewJavascriptCode, options);
    return stories;
}
