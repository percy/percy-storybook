import PropTypes from 'prop-types';
import React from 'react';
import './BlueText.css';

const BlueText = ({ children }) =>
  <div className="blue-text">
    {children}
  </div>;

BlueText.propTypes = {
  children: PropTypes.string.isRequired,
};

export default BlueText;
