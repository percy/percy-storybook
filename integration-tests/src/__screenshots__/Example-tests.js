import Example from '../Example';
import React from 'react';

describe('Example', () => {

  it('basic components work', () => {
    return (
      <Example>This is some text</Example>
    );
  });

  it('components with custom dimensions work', () => {
    return (
      <Example>This is some text</Example>
    );
  }, [320, 768]);

});
