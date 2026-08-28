import React from 'react';
import Skeleton from './Skeleton';
import styles from './TableSkeleton.module.css';

const TableSkeleton = ({ rows = 5 }) => {
    return (
        <div className={styles.tableSkeleton}>
            <div className={styles.tableHeader}>
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} width="100px" height="16px" />
                ))}
            </div>
            <div className={styles.tableBody}>
                {[...Array(rows)].map((_, rowIndex) => (
                    <div key={rowIndex} className={styles.tableRow}>
                        {[...Array(4)].map((_, colIndex) => (
                            <Skeleton
                                key={colIndex}
                                width={colIndex === 0 ? '120px' : '80px'}
                                height="14px"
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TableSkeleton;
