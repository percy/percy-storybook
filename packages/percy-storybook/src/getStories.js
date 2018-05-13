import jsdom from 'jsdom';
import { storiesKey } from './constants';

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

// jsdom doesn't support matchMedia yet.
const matchMediaMock = `
    window.matchMedia = window.matchMedia || (() => {
      return {
        matches: false,
        addListener: () => {},
        removeListener: () => {},
      };
    });
    `;

function getStoriesFromDom(previewJavascriptCode, options) {
  return new Promise((resolve, reject) => {
    const jsDomConfig = {
      html: '',
      url: 'https://example.com/iframe.js?selectedKind=none&selectedStory=none',
      src: [workerMock, localStorageMock, matchMediaMock, previewJavascriptCode],
      done: (err, window) => {
        if (err) return reject(err.response.body);
        if (!window) return reject(new Error('Window not found when looking for stories.'));

        // Check if the window has stories every 100ms for up to 10 seconds.
        // This allows 10 seconds for any async pre-tasks (like fetch) to complete.
        // Usually stories will be found on the first loop.
        var checkStories = function(timesCalled) {
          if (window[storiesKey]) {
            // Found the stories, return them.
            resolve(window[storiesKey]);
          } else if (timesCalled < 100) {
            // Stories not found yet, try again 100ms from now
            setTimeout(() => {
              checkStories(timesCalled + 1);
            }, 100);
          } else {
            // Attempted 100 times, give up.
            const message =
              'Storybook object not found on window. ' +
              "Check your call to serializeStories in your Storybook's config.js.";
            reject(new Error(message));
          }
        };
        checkStories(0);
      },
    };
    if (options.debug) {
      jsDomConfig.virtualConsole = jsdom.createVirtualConsole().sendTo(console);
    }
    jsdom.env(jsDomConfig);
  });
}

export default async function getStories(assets, javascriptPaths, options = {}) {
  if (!javascriptPaths || javascriptPaths === []) {
    throw new Error('Static javascript files could not be located in iframe.html.');
  }

  let storybookCode = '';
  javascriptPaths.forEach(function(path) {
    if (!assets[encodeURI(path)]) {
      throw new Error('Javascript file not found for: ' + path);
    }
    storybookCode = storybookCode + '\n' + assets[encodeURI(path)];
  });

  const stories = await getStoriesFromDom(storybookCode, options);
  return stories;
}
