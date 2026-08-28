import React from 'react';
import styles from './CipSystemLoader.module.css';

const CipSystemLoader = () => {
    return (
        <div className={styles.loaderContainer}>
            <div className={styles.systemBox}>
                {/* Animated CIP System */}
                <svg className={styles.circuitSvg} viewBox="0 0 280 220">
                    <defs>
                        <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="50%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#2563eb" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Main Pipe Circuit */}
                    <path
                        className={styles.pipeTrack}
                        d="M 60 180 L 60 60 Q 60 30 90 30 L 190 30 Q 220 30 220 60 L 220 180 Q 220 210 190 210 L 90 210 Q 60 210 60 180"
                    />

                    {/* Animated Liquid Flow */}
                    <path
                        className={styles.liquidFlow}
                        d="M 60 180 L 60 60 Q 60 30 90 30 L 190 30 Q 220 30 220 60 L 220 180 Q 220 210 190 210 L 90 210 Q 60 210 60 180"
                        stroke="url(#liquidGradient)"
                        filter="url(#glow)"
                    />

                    {/* Inlet Valve (Left) */}
                    <g className={styles.valve} transform="translate(60, 120)">
                        <circle cx="0" cy="0" r="8" fill="#64748b" stroke="#94a3b8" strokeWidth="2" />
                        <line x1="-5" y1="0" x2="5" y2="0" stroke="white" strokeWidth="2" />
                    </g>

                    {/* Outlet Valve (Right) */}
                    <g className={styles.valve} transform="translate(220, 120)">
                        <circle cx="0" cy="0" r="8" fill="#64748b" stroke="#94a3b8" strokeWidth="2" />
                        <line x1="0" y1="-5" x2="0" y2="5" stroke="white" strokeWidth="2" />
                    </g>

                    {/* Center Cleaning Tank */}
                    <g className={styles.tank} transform="translate(140, 120)">
                        {/* Tank Body */}
                        <rect x="-35" y="-45" width="70" height="90" rx="6"
                            fill="rgba(255,255,255,0.08)"
                            stroke="#cbd5e1"
                            strokeWidth="2.5" />

                        {/* Liquid Fill Animation */}
                        <rect className={styles.tankFill}
                            x="-32" y="43" width="64" height="0" rx="3"
                            fill="#3b82f6" opacity="0.75" />

                        {/* Bubbles */}
                        <circle className={styles.bubble1} cx="-15" cy="15" r="3" fill="white" opacity="0.7" />
                        <circle className={styles.bubble2} cx="15" cy="5" r="4" fill="white" opacity="0.6" />
                        <circle className={styles.bubble1} cx="0" cy="25" r="2.5" fill="white" opacity="0.8" />
                    </g>

                    {/* Spray Ball (Top) */}
                    <g className={styles.sprayBall} transform="translate(140, 30)">
                        <circle cx="0" cy="0" r="8" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5" />
                        {/* Spray Droplets */}
                        <circle cx="-12" cy="8" r="1.5" fill="#60a5fa" opacity="0.8" />
                        <circle cx="12" cy="8" r="1.5" fill="#60a5fa" opacity="0.8" />
                        <circle cx="0" cy="12" r="2" fill="#60a5fa" opacity="0.9" />
                    </g>

                    {/* Pipe Connectors */}
                    <circle className={styles.connector} cx="60" cy="60" r="6" />
                    <circle className={styles.connector} cx="220" cy="60" r="6" />
                    <circle className={styles.connector} cx="60" cy="180" r="6" />
                    <circle className={styles.connector} cx="220" cy="180" r="6" />

                </svg>

                <div className={styles.statusText}>
                    <span className={styles.statusDot}></span>
                    CIP System Processing...
                </div>
            </div>
        </div>
    );
};

export default CipSystemLoader;
