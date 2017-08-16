import React from 'react';
import RedText from '../RedText';

suite('RedText', () => {
  percySnapshot('basic components work', () => {
    return <RedText>This is some text</RedText>;
  });

  percySnapshot('components with custom dimensions work', { widths: [320, 768] }, () => {
    return <RedText>This is some text</RedText>;
  });
});
