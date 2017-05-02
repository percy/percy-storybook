import React from 'react';
import { storiesOf, action } from '@kadira/storybook';

storiesOf('Button', module)
  .add('with text', () => (
      <button onClick={action('clicked')}>Hello Button</button>
  ))
  .add('with some emoji', () => (
      <button onClick={action('clicked')}>😀 😎 👍 💯</button>
  ));
