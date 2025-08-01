export const flags = [{
  name: 'include',
  description: 'Pattern matching story names to include in snapshots',
  percyrc: 'storybook.include',
  type: 'pattern',
  multiple: true,
  short: 'i'
}, {
  name: 'exclude',
  description: 'Pattern matching story names to exclude from snapshots',
  percyrc: 'storybook.exclude',
  type: 'pattern',
  multiple: true,
  short: 'e'
}, {
  name: 'responsive-snapshot-capture',
  description: 'Enable responsive DOM capture for multiple viewport widths',
  percyrc: 'snapshot.responsiveSnapshotCapture',
  type: 'boolean',
  default: false
}, {
  name: 'widths',
  description: 'Comma-separated list of viewport widths for responsive capture (e.g. 375,768,1280)',
  percyrc: 'snapshot.widths',
  type: 'array',
  parse: (value) => value.split(',').map(w => parseInt(w.trim(), 10)).filter(w => !isNaN(w))
}, {
  name: 'shard-count',
  description: 'Number of shards to split snapshots into',
  validate: (count, { operators }) => (process.env.PERCY_PARALLEL_TOTAL ||= ((
    // default total to -1 for partial builds or the provided the count otherwise
    Array.from(operators.entries()).find(a => a[0].name === 'partial')?.[1]
  ) ? '-1' : `${count}`)),
  parse: v => parseInt(v, 10),
  type: 'number'
}, {
  name: 'shard-size',
  description: 'Size of each shard to split snapshots into',
  validate: () => (process.env.PERCY_PARALLEL_TOTAL ||= '-1'),
  parse: v => parseInt(v, 10),
  type: 'number'
}, {
  name: 'shard-index',
  description: 'Index of the shard to take snapshots of',
  parse: v => parseInt(v, 10),
  type: 'index'
}, {
  name: 'partial',
  description: 'Marks the build as a partial build',
  validate: () => (process.env.PERCY_PARTIAL_BUILD ||= '1')
}];
