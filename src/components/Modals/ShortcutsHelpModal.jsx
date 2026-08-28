import React from 'react';
import styles from './ShortcutsHelpModal.module.css';

const ShortcutsHelpModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const shortcuts = [
        {
            category: 'Navigation', items: [
                { keys: ['Ctrl', 'D'], description: 'Go to Dashboard' },
                { keys: ['Ctrl', 'M'], description: 'Go to Monitoring' },
                { keys: ['Ctrl', 'A'], description: 'Go to Analytics' },
                { keys: ['Ctrl', 'L'], description: 'Go to Alarms' },
                { keys: ['Ctrl', 'H'], description: 'Go to Help' },
                { keys: ['Ctrl', 'S'], description: 'Go to Settings' },
            ]
        },
        {
            category: 'Actions', items: [
                { keys: ['Ctrl', 'B'], description: 'Toggle Sidebar' },
                { keys: ['?'], description: 'Show this help' },
                { keys: ['Esc'], description: 'Close modals' },
            ]
        },
    ];

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>⌨️ Keyboard Shortcuts</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className={styles.content}>
                    {shortcuts.map((section) => (
                        <div key={section.category} className={styles.section}>
                            <h3>{section.category}</h3>
                            <div className={styles.shortcuts}>
                                {section.items.map((shortcut, index) => (
                                    <div key={index} className={styles.shortcut}>
                                        <div className={styles.keys}>
                                            {shortcut.keys.map((key, keyIndex) => (
                                                <React.Fragment key={keyIndex}>
                                                    <kbd className={styles.key}>{key}</kbd>
                                                    {keyIndex < shortcut.keys.length - 1 && (
                                                        <span className={styles.plus}>+</span>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                        <span className={styles.description}>{shortcut.description}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.footer}>
                    <p>💡 Tip: Press <kbd className={styles.key}>?</kbd> anytime to see these shortcuts</p>
                </div>
            </div>
        </div>
    );
};

export default ShortcutsHelpModal;
