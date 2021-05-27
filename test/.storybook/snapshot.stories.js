import React from 'react';

const Snapshot = ({ when }) => (
  <p>Snapshot me {when}!</p>
);

export default {
  title: 'Snapshot',
  component: Snapshot
};

export const First = () => (
  <Snapshot when="first"/>
);

export const Second = () => (
  <Snapshot when="second"/>
);
