import Example from '../Example';
import React from 'react';

suite('Example', () => {
  percySnapshot('basic components work', () => {
    return <Example>This is some text</Example>;
  });

  percySnapshot(
    'components with custom dimensions work',
    () => {
      return <Example>This is some text</Example>;
    },
    [320, 768],
  );
});
