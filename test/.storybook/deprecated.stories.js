import React from 'react';

const Deprecated = () => (
  <p>I have deprecated options!</p>
);

export default {
  title: 'Deprecated',
  component: Deprecated,
  parameters: {
    percy: { skip: true }
  }
};

export const Snapshots = () => (
  <Deprecated/>
);

Snapshots.parameters = {
  percy: {
    snapshots: [{
      suffix: ' option'
    }]
  }
};
