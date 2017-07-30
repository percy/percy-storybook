import PropTypes from 'prop-types';
import React from 'react';
import styles from './Example.css';

const Example = ({ children }) =>
  <div className={styles.text}>
    {children}
  </div>;

Example.propTypes = {
  children: PropTypes.string.isRequired,
};

export default Example;
