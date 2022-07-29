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
      }, {
        prefix: 'Special ',
        args: {
          null: null,
          undefined: undefined,
          smallNum: 3,
          largeNum: 12_000_000,
          date: new Date('2022-01-01T00:00Z'),
          rgb: 'rgb(20, 30, 40)',
          rgba: 'rgba(20, 30, 40, .5)',
          hsl: 'hsl(120, 80%, 30%)',
          hsla: 'hsla(120, 80%, 30%, .5)',
          shortHex: '#c6c',
          longHex: '#a907cf',
          alphaHex: '#a907cf9f'
        }
      }]
    }
  }
};
