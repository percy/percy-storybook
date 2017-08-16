import PropTypes from 'prop-types';
import React from 'react';
import styles from './RedText.css';

const RedText = ({ children }) =>
  <div className={styles.text}>
    {children}
  </div>;

RedText.propTypes = {
  children: PropTypes.string.isRequired,
};

export default RedText;
