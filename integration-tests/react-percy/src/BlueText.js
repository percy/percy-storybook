import PropTypes from 'prop-types';
import React from 'react';
import styles from './BlueText.css';

const BlueText = ({ children }) =>
  <div className={styles.text}>
    {children}
  </div>;

BlueText.propTypes = {
  children: PropTypes.string.isRequired,
};

export default BlueText;
