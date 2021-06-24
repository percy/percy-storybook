import React from 'react';

export const Args = ({ text, style }) => (
  <p style={style}>{text}!</p>
);

Args.args = {
  text: 'Snapshot args'
};

export default {
  title: 'Args',
  component: Args,
  parameters: {
    percy: {
      name: 'Args',
      skip: true,
      additionalSnapshots: [{
        prefix: 'Custom ',
        args: {
          text: 'Snapshot custom args',
          style: {
            font: '1rem sans-serif'
          }
        }
      }, {
        suffix: ' (bold)',
        args: {
          text: 'Snapshot custom bold args',
          style: {
            font: '1rem sans-serif',
            fontWeight: 'bold'
          }
        }
      }, {
        name: 'Purple (Args)',
        args: {
          text: 'Snapshot purple args',
          style: {
            font: '1rem sans-serif',
            fontWeight: 'bold',
            color: 'purple'
          }
        }
      }]
    }
  }
};
