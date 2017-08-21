/**
 * @jest-environment jsdom
 */

/* eslint-env browser */

import React from 'react';
import render from '../';

// RedBox doesn't work well in non-browser environments, so mock it to something
// Node-friendly.
/* eslint-disable react/display-name, react/prop-types */
jest.mock('redbox-react', () => ({ error }) =>
  <div>
    {error.message}
  </div>,
);
/* eslint-enable react/display-name, react/prop-types */

let el;

beforeEach(() => {
  document.body.innerHTML = '';

  el = document.createElement('div');
  document.body.appendChild(el);
});

it('renders the specified React markup into the DOM element', () => {
  const markup = <div>some markup</div>;

  render(markup, el);

  expect(el.innerHTML).toMatchSnapshot();
});

it('renders error message into the DOM element when rendering fails', async () => {
  /* eslint-disable react/prop-types */
  const Date = props =>
    <div>
      {props.date.format('dddd')}
    </div>;
  /* eslint-react/prop-types */

  render(<Date />, el);

  await new Promise(resolve => {
    setTimeout(() => {
      resolve();
    });
  });

  expect(el.innerHTML).toMatchSnapshot();
});
