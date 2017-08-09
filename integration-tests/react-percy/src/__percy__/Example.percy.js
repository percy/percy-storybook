import Example from '../Example';
import React from 'react';

suite('Example', () => {
  percySnapshot('basic components work', () => {
    return <Example>This is some text</Example>;
  });

  percySnapshot('components with custom dimensions work', { widths: [320, 768] }, () => {
    return <Example>This is some text</Example>;
  });
});
