import React from 'react';
import Skeleton from './Skeleton';
import styles from './CardSkeleton.module.css';

const CardSkeleton = () => {
    return (
        <div className={styles.cardSkeleton}>
            <div className={styles.header}>
                <Skeleton width="40px" height="40px" variant="circle" />
                <div className={styles.headerText}>
                    <Skeleton width="120px" height="16px" />
                    <Skeleton width="80px" height="12px" />
                </div>
            </div>
            <div className={styles.content}>
                <Skeleton width="60%" height="32px" />
                <Skeleton width="40%" height="14px" />
            </div>
        </div>
    );
};

export default CardSkeleton;
