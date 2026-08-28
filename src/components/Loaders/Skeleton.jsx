import React from 'react';
import styles from './Skeleton.module.css';

const Skeleton = ({
    width = '100%',
    height = '20px',
    variant = 'rect',
    className = ''
}) => {
    const variantClass = styles[variant] || styles.rect;

    return (
        <div
            className={`${styles.skeleton} ${variantClass} ${className}`}
            style={{ width, height }}
        />
    );
};

export default Skeleton;
