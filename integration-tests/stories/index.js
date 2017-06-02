import React from 'react';
import { storiesOf, action } from '@kadira/storybook';
import { MatchMediaHOC } from 'react-match-media';
import Example from '../src/Example';

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

storiesOf('Example', module)
  .add('Normal render', () => (
      <Example>This is the Example control</Example>
  ));

const ComponentForBigScreen = MatchMediaHOC(Example, '(min-width: 800px)');
const ComponentForSmallScreen = MatchMediaHOC(Example, '(max-width: 500px)');

storiesOf('MatchMedia', module)
  .add('MatchMedia works with Mock', () => (
      <div>
          <ComponentForBigScreen>Example for big screen</ComponentForBigScreen>
          <ComponentForSmallScreen>Example for small screen</ComponentForSmallScreen>
      </div>
  ));
