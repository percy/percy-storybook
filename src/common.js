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
  name: 'shard-count',
  description: 'Number of shards to split snapshots into',
  parse: v => parseInt(v, 10),
  type: 'number'
}, {
  name: 'shard-size',
  description: 'Size of each shard to split snapshots into',
  parse: v => parseInt(v, 10),
  type: 'number'
}, {
  name: 'shard-index',
  description: 'Index of the shard to take snapshots of',
  parse: v => (process.env.PERCY_PARALLEL_TOTAL ||= '-1') && parseInt(v, 10),
  type: 'index'
}, {
  name: 'partial',
  description: 'Marks the build as a partial build',
  parse: () => !!(process.env.PERCY_PARTIAL_BUILD ||= '1')
}];
