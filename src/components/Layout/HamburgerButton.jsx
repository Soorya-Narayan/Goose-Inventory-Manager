import React from 'react';
import styles from './HamburgerButton.module.css';

const HamburgerButton = ({ isOpen, onClick }) => {
    return (
        <button
            className={`${styles.hamburger} ${isOpen ? styles.open : ''}`}
            onClick={onClick}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
        >
            <span className={styles.line}></span>
            <span className={styles.line}></span>
            <span className={styles.line}></span>
        </button>
    );
};

export default HamburgerButton;
