import PropTypes from 'prop-types';
import React from 'react';
import './RedText.css';

const RedText = ({ children }) =>
  <div className="red-text">
    {children}
  </div>;

RedText.propTypes = {
  children: PropTypes.string.isRequired,
};

export default RedText;
