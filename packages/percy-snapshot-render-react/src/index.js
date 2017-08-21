import React from 'react';
import ReactDOM from 'react-dom';
import RedBox from 'redbox-react';

export default function render(markup, el) {
  try {
    ReactDOM.render(markup, el);
  } catch (e) {
    ReactDOM.render(<RedBox error={e} />, el);
  }
}
