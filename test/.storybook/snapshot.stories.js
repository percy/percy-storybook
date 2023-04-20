import React from 'react';

const Snapshot = ({ when }) => (
  <div>
    <p className='removeMe'>This heading should be removed using domTransformation</p>
    <p>Snapshot me {when}!</p>
  </div>
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
