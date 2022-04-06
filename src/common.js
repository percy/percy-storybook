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
}];
