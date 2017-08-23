const percyGlobals = [
  'after',
  'afterAll',
  'afterEach',
  'before',
  'beforeAll',
  'beforeEach',
  'percySnapshot',
  'suite',
];

const eslintWhitelistGlobals =
  '/* global ' + percyGlobals.map(global => `${global}:false`).join(', ') + ' */ ';

function percySnapshotLoader(source, map) {
  return this.callback(null, eslintWhitelistGlobals + source, map);
}

module.exports = percySnapshotLoader;
