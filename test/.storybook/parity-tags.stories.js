import React from 'react';

const Probe = ({ label }, { globals }) => (
  <p>{label}{globals?.text}</p>
);

export default {
  title: 'Parity/Tags',
  component: Probe,
  tags: ['team-a'],
  args: { label: 'tags' }
};

export const Gamma = { tags: ['visual-smoke'] };

export const Delta = { tags: ['team-b'] };

export const NoModes = {
  parameters: { percy: { modes: [] } }
};

export const OwnExclude = {
  parameters: { percy: { exclude: [/Own Exclude/] } }
};
