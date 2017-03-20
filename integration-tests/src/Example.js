import React from 'react';
import styles from './Example.css';

export default class Example {

    render() {
        return (
            <div className={styles.text}>{this.props.children}</div>
        );
    }

}
