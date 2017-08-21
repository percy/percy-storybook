/**
 * @jest-environment jsdom
 */

/* eslint-env browser */

import { GlobalVariables, RootElementId } from '../constants';
import fs from 'fs';
import vm from 'vm';
import writeRenderEntry from '../writeRenderEntry';

jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
}));

let filePath;
let percyConfig;
let renderer;
let resolver;
let rootEl;
let snapshotMarkup;
let snapshotName;

const givenRenderer = mockRenderer => {
  jest.resetModules();
  jest.mock('mock-renderer', () => mockRenderer, { virtual: true });
  renderer = require('mock-renderer'); // eslint-disable-line
};

const givenSnapshot = (name, markup) => {
  const href = `http://percy.test?snapshot=${encodeURIComponent(name)}`;
  Object.defineProperty(window.location, 'href', {
    get() {
      return href;
    },
    configurable: true,
    writeable: true,
  });

  window[GlobalVariables.rootSuite] = {
    getSnapshotMarkup(snapshotName) {
      const snapshotMarkup = snapshotName === name ? markup : undefined;
      return {
        then: cb => cb(snapshotMarkup),
      };
    },
  };
};

const runRenderEntry = () => {
  const context = vm.createContext();
  const global = vm.runInContext('this', context);
  global.global = window;
  global.window = window;
  global.document = document;
  global.require = require;

  const [filePath, src] = fs.writeFileSync.mock.calls[0];
  const script = new vm.Script(src, {
    filename: filePath,
    displayErrors: true,
  });
  script.runInContext(context, {
    displayErrors: true,
  });
};

beforeEach(() => {
  fs.writeFileSync.mockReset();

  document.body.innerHTML = '';

  rootEl = document.createElement('div');
  rootEl.id = RootElementId;
  document.body.appendChild(rootEl);

  percyConfig = {
    renderer: 'mock-renderer',
  };
  filePath = '/path/to/render.js';
  resolver = () => 'mock-renderer';
  snapshotMarkup = '<span>mock snapshot markup</span>';
  snapshotName = 'mock: snapshot: name';

  givenRenderer(jest.fn());
});

it('writes entry to specified file path', () => {
  filePath = '/path/to/file.js';

  writeRenderEntry(percyConfig, filePath, resolver);

  expect(fs.writeFileSync).toHaveBeenCalledWith(filePath, expect.any(String));
});

it('renders the snapshot markup in the root element', () => {
  givenSnapshot(snapshotName, snapshotMarkup);

  writeRenderEntry(percyConfig, filePath, resolver);

  runRenderEntry();

  expect(renderer).toHaveBeenCalledWith(snapshotMarkup, rootEl);
});

it('works when resolver is an ES6 default export', () => {
  givenRenderer({
    default: jest.fn(),
  });
  givenSnapshot(snapshotName, snapshotMarkup);

  writeRenderEntry(percyConfig, filePath, resolver);

  runRenderEntry();

  expect(renderer.default).toHaveBeenCalledWith(snapshotMarkup, rootEl);
});
