import React from 'react';
import { storiesOf, action } from '@kadira/storybook';
import faker from 'faker';
import { MatchMediaHOC } from 'react-match-media';
import Example from '../src/Example';

storiesOf('Button', module)
  .add('with text', () => (
      <button onClick={action('clicked')}>Hello Button</button>
  ))
  .add('with some emoji', () => (
      <button onClick={action('clicked')}>😀 😎 👍 💯</button>
  ));

storiesOf('Static CSS', module)
  .add('green text using static css', () => (
      <p className="green">Hi there! This text should be green.</p>
  ))
  .add('blue text using static css in sub_dir', () => (
      <p className="blue">Hi there! This text should be blue.</p>
  ));

storiesOf('Frozen Time', module)
    .add('Show the current date', () => (
        <div>
            <p>In Percy&apos;s screenshot the current date should be frozen to 2015 thanks to timemachine.</p>
            <p>See .storybook/config.js or&nbsp;
            <a href="https://www.npmjs.com/package/faker#setting-a-randomness-seed">
              faker&apos;s docs
            </a>
            &nbsp;for how it&apos;s configured.</p>
            <p>The current date is: {new Date().toLocaleDateString()}</p>
        </div>
    ));

const name = faker.name.findName();
const email = faker.internet.email();

storiesOf('Faker', module)
    .add('Show a fake name and email', () => (
        <div>
            <p>In Percy&apos;s screenshot the fake data should be the same thanks to faker&apos;s seed.</p>
            <p>See .storybook/config.js or&nbsp;
              <a href="https://www.npmjs.com/package/timemachine#config">
                timemachine&apos;s docs
              </a>
              &nbsp;for how it&apos;s configured.</p>
            <p>The name is: {name}</p>
            <p>The email is: {email}</p>
        </div>
    ));

const ComponentForBigScreen = MatchMediaHOC(Example, '(min-width: 800px)');
const ComponentForSmallScreen = MatchMediaHOC(Example, '(max-width: 500px)');

storiesOf('MatchMedia', module)
  .add('Example control without MatchMedia', () => (
      <Example>This is the Example control</Example>
  ))
  .add('Example control with MatchMedia', () => (
      <div>
          <ComponentForBigScreen>Example for big screen</ComponentForBigScreen>
          <ComponentForSmallScreen>Example for small screen</ComponentForSmallScreen>
      </div>
  ));
