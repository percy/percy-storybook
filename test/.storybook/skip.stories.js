import React from 'react';

const Skip = ({ jk }) => (
  <p>Do {jk || 'not'} snapshot me!</p>
);

export default {
  title: 'Skip',
  component: Skip,
  parameters: {
    percy: { skip: true }
  }
};

export const Skipped = () => (
  <Skip/>
);

export const ButNotMe = () => (
  <Skip jk/>
);

ButNotMe.parameters = {
  percy: { skip: false }
};
