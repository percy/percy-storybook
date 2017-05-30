import React from 'react';
import { storiesOf, action } from '@kadira/storybook';

storiesOf('Button', module)
  .add('with text', () => (
      <button onClick={action('clicked')}>Hello Button</button>
  ))
  .add('with some emoji', () => (
      <button onClick={action('clicked')}>😀 😎 👍 💯</button>
  ));

storiesOf('Text', module)
  .add('green text using static css', () => (
      <p className="green">Hi there! This text should be green.</p>
  ))
  .add('blue text using static css in sub_dir', () => (
      <p className="blue">Hi there! This text should be blue.</p>
  ));
