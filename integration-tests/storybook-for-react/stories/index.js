import React from 'react';
import { storiesOf } from '@storybook/react';
import { withInfo } from '@storybook/addon-info';
import { action } from '@storybook/addon-actions';
import { withKnobs, number } from '@storybook/addon-knobs';
import { Button } from '@storybook/react/demo';
import faker from 'faker';

// Disabling the two lines below until react-match-media that works with react 16 is released
// import { MatchMediaHOC } from 'react-match-media';
// import Example from '../src/Example';

storiesOf('Button', module)
  .add('with text', () => <Button onClick={action('clicked')}>Hello Button</Button>)
  .add('with some emoji', () => (
    <Button onClick={action('clicked')}>
      <span role="img" aria-label="so cool">
        😀 😎 👍 💯
      </span>
    </Button>
  ));

storiesOf('Static CSS', module)
  .add('green text using static css', () => (
    <p className="green">Hi there! This text should be green.</p>
  ))
  .add('blue text using static css in sub_dir', () => (
    <p className="blue">Hi there! This text should be blue when rendered in Percy.</p>
  ));

storiesOf('Percy specific CSS', module).add('purple text using percy specific css', () => (
  <p className="purple-in-percy">Hi there! This text should be Purple in Percy screenshots.</p>
));

storiesOf('Managing Dynamic Data.Frozen Time', module).add('Show the current date', () => (
  <div>
    <p>
      In Percy&apos;s screenshot (but not local dev) the current date should be frozen to 2015
      thanks to mockdate and inPercy.
    </p>
    <p>
      See storybook/config.js or&nbsp;
      <a href="https://github.com/boblauer/MockDate">mockdate&apos;s docs</a>
      &nbsp;for how it&apos;s configured.
    </p>
    <p>The current date is: {new Date().toLocaleDateString()}</p>
  </div>
));

const name = faker.name.findName();
const email = faker.internet.email();

storiesOf('Managing Dynamic Data.Faker', module).add('Show a fake name and email', () => (
  <div>
    <p>
      In Percy&apos;s screenshot (but not local dev) the fake data should be the same thanks to
      faker&apos;s seed and inPercy.
    </p>
    <p>
      See storybook/config.js or&nbsp;
      <a href="https://www.npmjs.com/package/faker#setting-a-randomness-seed">faker&apos;s docs</a>
      &nbsp;for how it&apos;s configured.
    </p>
    <p>The name is: {name}</p>
    <p>The email is: {email}</p>
    <p>The hostname is: {window.location.hostname}</p>
  </div>
));

// Disabling these until a new release of react-match-media that's compatible with react 16
// const ComponentForBigScreen = MatchMediaHOC(Example, '(min-width: 800px)');
// const ComponentForSmallScreen = MatchMediaHOC(Example, '(max-width: 500px)');

// storiesOf('MatchMedia', module)
//   .add('Example control without MatchMedia', () => <Example>This is the Example control</Example>)
//   .add('Example control with MatchMedia', () => (
//     <div>
//       <ComponentForBigScreen>Example for big screen</ComponentForBigScreen>
//       <ComponentForSmallScreen>Example for small screen</ComponentForSmallScreen>
//     </div>
//   ));

let direction = 'ltr';
if (window && window.location && window.location.search.indexOf('direction=rtl') > -1) {
  direction = 'rtl';
}

// --rtl_regex=Direction is used, so we create some stories that get matched
const rtlRegex = 'Direction';

storiesOf(`${rtlRegex} Demo`, module).add('Show the direction', () => (
  <div className={direction}>
    <p>The direction is {direction}.</p>
    <p>In Percy this story will be rendered twice automatically, once for each direction.</p>
    <p>This happens because the name matches the rtl_regex command line argument.</p>
  </div>
));

storiesOf('Hierarchy.separator.is.supported', module).add('story', () => (
  <span>Hello hierarchySeparator</span>
));

storiesOf('addWithPercyOptions', module)
  .add('multiple widths', () => <span>Renders in multiple widths</span>, {
    percy: { widths: [222, 333] },
  })
  .add('single width', () => <span>Renders in one width</span>, {
    percy: { widths: [444] },
  })
  .add('without options', () => <span>Renders with the fallback width(s)</span>)
  .add('with skip option', () => <span>Will not Render</span>, {
    percy: { skip: true },
  })
  .add('with minimum height', () => <span>Renders with multiple</span>, {
    percy: { minimum_height: 750 },
  })
  .add(
    'with RTL of true for a single story',
    () => (
      <div className={direction}>
        <span>The direction is {direction}.</span>
      </div>
    ),
    { percy: { rtl: true } },
  )
  .add(
    `${rtlRegex}: with RTL override of false even though the RTL regex matches`,
    // rtl: false trumps a positive rtl_regex match
    () => (
      <span>
        This story will only render in one direction. The direction is {direction} == ltr.
      </span>
    ),
    { percy: { rtl: false } },
  );

const someString = 'this is my 1st inserted string';
storiesOf('With info addon', module)
  .add('some story', withInfo('doc string about my component')(() => <span>info story</span>))
  .add(
    'with withInfo instead of addWithInfo',
    withInfo(`doc string about my component: ${someString}`)(() => <span>info 555px width</span>),
    { percy: { widths: [555] } },
  );

const someOtherString = 'this is my 2nd inserted string';
storiesOf('withInfo added as decorator', module)
  .addDecorator(withInfo)
  .add(
    'A story with info',
    () => {
      return (
        <span>
          This story has a jsx component in the info to test story sanitation in page.evaluate
        </span>
      );
    },
    {
      info: {
        text: (
          <>
            <p
              style={{
                marginBottom: '0',
                width: '100%',
                textAlign: 'center',
                padding: '100px 10px',
                backgroundColor: '#29c2b5',
              }}
            >
              my inserted string: {someOtherString}
            </p>
          </>
        ),
      },
    },
  );

storiesOf('@names that need sanitizing', module)
  .add('name with [square] brackets & {braces}', () => (
    <span>Has a name with [square] brackets & braces</span>
  ))
  .add('name with "double" quotes', () => <span>Has a name with double quotes</span>)
  .add("name with 'single' quotes", () => <span>Has a name with single quotes</span>);

storiesOf('Story with knobs', module)
  .addDecorator(withKnobs)
  .add('A story with knobs', () => {
    const numKnobs = number('Knobs', 5);
    return <span>This story has {numKnobs} knobs to test the knobs addon</span>;
  });
