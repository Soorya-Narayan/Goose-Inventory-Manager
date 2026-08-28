import React from 'react';
import Skeleton from './Skeleton';
import styles from './ChartSkeleton.module.css';

const ChartSkeleton = ({ height = '300px' }) => {
    return (
        <div className={styles.chartSkeleton} style={{ height }}>
            <div className={styles.header}>
                <Skeleton width="180px" height="20px" />
                <Skeleton width="100px" height="14px" />
            </div>
            <div className={styles.chartArea}>
                <div className={styles.yAxis}>
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} width="30px" height="12px" />
                    ))}
                </div>
                <div className={styles.chartContent}>
                    {[...Array(8)].map((_, i) => (
                        <Skeleton
                            key={i}
                            width="100%"
                            height={`${Math.random() * 60 + 40}%`}
                        />
                    ))}
                </div>
            </div>
            <div className={styles.xAxis}>
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} width="40px" height="12px" />
                ))}
            </div>
        </div>
    );
};

export default ChartSkeleton;
