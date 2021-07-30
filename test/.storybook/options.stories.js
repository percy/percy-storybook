import React from 'react';

const Options = ({ type }) => (
  <p>I have ${type} options!</p>
);

export default {
  title: 'Options',
  component: Options
};

export const Deprecated = () => (
  <Options type="deprecated"/>
);

Deprecated.parameters = {
  percy: {
    snapshots: [{
      suffix: ' (snapshots)'
    }]
  }
};

export const InvalidOne = () => (
  <Options type="invalid"/>
);

InvalidOne.parameters = {
  percy: {
    invalid: 'foobar'
  }
};

export const InvalidTwo = () => (
  <Options type="duplicate invalid"/>
);

InvalidTwo.parameters = {
  percy: {
    invalid: 'barbaz'
  }
};
