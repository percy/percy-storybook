import React from 'react';

export const Params = ({ text }, { globals }) => {
  let param = new URLSearchParams(window.location.search).get('text') || '';
  return (<p>{text}{globals.text}{param}</p>);
};

Params.args = {
  text: 'Mixed params'
};

export default {
  title: 'Mixed',
  component: Params,
  parameters: {
    percy: {
      name: 'From params',
      skip: true,
      additionalSnapshots: [{
        suffix: ' w/ globals',
        globals: { text: ' with globals' }
      }, {
        suffix: ' w/ query params',
        queryParams: { text: ' with query params' }
      }, {
        suffix: ' w/ mixed params',
        args: { text: 'Args' },
        globals: { text: ' globals' },
        queryParams: { text: ' and params' }
      }]
    }
  }
};
