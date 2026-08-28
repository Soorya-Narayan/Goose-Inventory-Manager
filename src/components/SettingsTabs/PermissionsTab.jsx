// src/components/SettingsTabs/PermissionsTab.jsx
import React, { useState } from 'react';
import styles from './PermissionsTab.module.css';

const PermissionsTab = () => {
    // State for configurable roles (Operator and Viewer)
    const [operatorPermissions, setOperatorPermissions] = useState({
        view_dashboard: true,
        view_live_data: true,
        start_stop_cycles: true,
        modify_setpoints: false,
        configure_alarms: false,
        acknowledge_alarms: true,
        export_data: true,
        manage_users: false,
        system_config: false,
        override_safety: false,
        view_audit_logs: true,
        delete_records: false,
        manage_roles: false,
        backup_restore: false
    });

    const [viewerPermissions, setViewerPermissions] = useState({
        view_dashboard: true,
        view_live_data: true,
        start_stop_cycles: false,
        modify_setpoints: false,
        configure_alarms: false,
        acknowledge_alarms: false,
        export_data: false,
        manage_users: false,
        system_config: false,
        override_safety: false,
        view_audit_logs: false,
        delete_records: false,
        manage_roles: false,
        backup_restore: false
    });

    const [hasChanges, setHasChanges] = useState(false);

    const handleTogglePermission = (role, permissionKey) => {
        setHasChanges(true);
        if (role === 'Operator') {
            setOperatorPermissions(prev => ({
                ...prev,
                [permissionKey]: !prev[permissionKey]
            }));
        } else if (role === 'Viewer') {
            setViewerPermissions(prev => ({
                ...prev,
                [permissionKey]: !prev[permissionKey]
            }));
        }
    };

    const handleSaveChanges = () => {
        // In a real app, this would save to backend
        console.log('Saving permission changes:', { operatorPermissions, viewerPermissions });
        setHasChanges(false);
        alert('Permission changes saved successfully!');
    };

    const handleResetChanges = () => {
        // Reset to defaults
        setOperatorPermissions({
            view_dashboard: true,
            view_live_data: true,
            start_stop_cycles: true,
            modify_setpoints: false,
            configure_alarms: false,
            acknowledge_alarms: true,
            export_data: true,
            manage_users: false,
            system_config: false,
            override_safety: false,
            view_audit_logs: true,
            delete_records: false,
            manage_roles: false,
            backup_restore: false
        });
        setViewerPermissions({
            view_dashboard: true,
            view_live_data: true,
            start_stop_cycles: false,
            modify_setpoints: false,
            configure_alarms: false,
            acknowledge_alarms: false,
            export_data: false,
            manage_users: false,
            system_config: false,
            override_safety: false,
            view_audit_logs: false,
            delete_records: false,
            manage_roles: false,
            backup_restore: false
        });
        setHasChanges(false);
    };
    const roles = [
        {
            name: 'Administrator',
            icon: 'fa-user-shield',
            color: '#8b5cf6',
            description: 'System administrator with full control over users and permissions',
            permissions: [
                { key: 'view_dashboard', label: 'View Dashboard & Analytics', granted: true },
                { key: 'view_live_data', label: 'View Live Process Data', granted: true },
                { key: 'start_stop_cycles', label: 'Start/Stop CIP Cycles', granted: true },
                { key: 'modify_setpoints', label: 'Modify Setpoints & Parameters', granted: true },
                { key: 'configure_alarms', label: 'Configure Alarm Thresholds', granted: true },
                { key: 'acknowledge_alarms', label: 'Acknowledge & Clear Alarms', granted: true },
                { key: 'export_data', label: 'Export Reports & Data', granted: true },
                { key: 'manage_users', label: 'Manage Users & Permissions', granted: true },
                { key: 'system_config', label: 'System Configuration Access', granted: true },
                { key: 'override_safety', label: 'Override Safety Interlocks', granted: true },
                { key: 'view_audit_logs', label: 'View Audit Logs', granted: true },
                { key: 'delete_records', label: 'Delete Historical Records', granted: true },
                { key: 'manage_roles', label: 'Configure Role Permissions', granted: true, highlight: true },
                { key: 'backup_restore', label: 'Backup & Restore System', granted: true, highlight: true }
            ]
        },
        {
            name: 'Engineer',
            icon: 'fa-user-gear',
            color: '#3b82f6',
            description: 'Technical expert with full operational access',
            permissions: [
                { key: 'view_dashboard', label: 'View Dashboard & Analytics', granted: true },
                { key: 'view_live_data', label: 'View Live Process Data', granted: true },
                { key: 'start_stop_cycles', label: 'Start/Stop CIP Cycles', granted: true },
                { key: 'modify_setpoints', label: 'Modify Setpoints & Parameters', granted: true },
                { key: 'configure_alarms', label: 'Configure Alarm Thresholds', granted: true },
                { key: 'acknowledge_alarms', label: 'Acknowledge & Clear Alarms', granted: true },
                { key: 'export_data', label: 'Export Reports & Data', granted: true },
                { key: 'manage_users', label: 'Manage Users & Permissions', granted: false },
                { key: 'system_config', label: 'System Configuration Access', granted: true },
                { key: 'override_safety', label: 'Override Safety Interlocks', granted: true },
                { key: 'view_audit_logs', label: 'View Audit Logs', granted: true },
                { key: 'delete_records', label: 'Delete Historical Records', granted: false },
                { key: 'manage_roles', label: 'Configure Role Permissions', granted: false },
                { key: 'backup_restore', label: 'Backup & Restore System', granted: false }
            ]
        },
        {
            name: 'Operator',
            icon: 'fa-user-check',
            color: '#10b981',
            description: 'Day-to-day operations with limited configuration access',
            configurable: true,
            permissions: [
                { key: 'view_dashboard', label: 'View Dashboard & Analytics', granted: operatorPermissions.view_dashboard },
                { key: 'view_live_data', label: 'View Live Process Data', granted: operatorPermissions.view_live_data },
                { key: 'start_stop_cycles', label: 'Start/Stop CIP Cycles', granted: operatorPermissions.start_stop_cycles },
                { key: 'modify_setpoints', label: 'Modify Setpoints & Parameters', granted: operatorPermissions.modify_setpoints, note: operatorPermissions.modify_setpoints ? '' : 'Limited range only' },
                { key: 'configure_alarms', label: 'Configure Alarm Thresholds', granted: operatorPermissions.configure_alarms },
                { key: 'acknowledge_alarms', label: 'Acknowledge & Clear Alarms', granted: operatorPermissions.acknowledge_alarms },
                { key: 'export_data', label: 'Export Reports & Data', granted: operatorPermissions.export_data },
                { key: 'manage_users', label: 'Manage Users & Permissions', granted: operatorPermissions.manage_users },
                { key: 'system_config', label: 'System Configuration Access', granted: operatorPermissions.system_config },
                { key: 'override_safety', label: 'Override Safety Interlocks', granted: operatorPermissions.override_safety },
                { key: 'view_audit_logs', label: 'View Audit Logs', granted: operatorPermissions.view_audit_logs },
                { key: 'delete_records', label: 'Delete Historical Records', granted: operatorPermissions.delete_records },
                { key: 'manage_roles', label: 'Configure Role Permissions', granted: operatorPermissions.manage_roles },
                { key: 'backup_restore', label: 'Backup & Restore System', granted: operatorPermissions.backup_restore }
            ]
        },
        {
            name: 'Viewer',
            icon: 'fa-user',
            color: '#64748b',
            description: 'Read-only access for monitoring and reporting',
            configurable: true,
            permissions: [
                { key: 'view_dashboard', label: 'View Dashboard & Analytics', granted: viewerPermissions.view_dashboard },
                { key: 'view_live_data', label: 'View Live Process Data', granted: viewerPermissions.view_live_data },
                { key: 'start_stop_cycles', label: 'Start/Stop CIP Cycles', granted: viewerPermissions.start_stop_cycles },
                { key: 'modify_setpoints', label: 'Modify Setpoints & Parameters', granted: viewerPermissions.modify_setpoints },
                { key: 'configure_alarms', label: 'Configure Alarm Thresholds', granted: viewerPermissions.configure_alarms },
                { key: 'acknowledge_alarms', label: 'Acknowledge & Clear Alarms', granted: viewerPermissions.acknowledge_alarms },
                { key: 'export_data', label: 'Export Reports & Data', granted: viewerPermissions.export_data },
                { key: 'manage_users', label: 'Manage Users & Permissions', granted: viewerPermissions.manage_users },
                { key: 'system_config', label: 'System Configuration Access', granted: viewerPermissions.system_config },
                { key: 'override_safety', label: 'Override Safety Interlocks', granted: viewerPermissions.override_safety },
                { key: 'view_audit_logs', label: 'View Audit Logs', granted: viewerPermissions.view_audit_logs },
                { key: 'delete_records', label: 'Delete Historical Records', granted: viewerPermissions.delete_records },
                { key: 'manage_roles', label: 'Configure Role Permissions', granted: viewerPermissions.manage_roles },
                { key: 'backup_restore', label: 'Backup & Restore System', granted: viewerPermissions.backup_restore }
            ]
        }
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2><i className="fa-solid fa-shield-halved" /> Role-Based Access Control</h2>
                <p>Define permissions for each user role in the CIP system</p>
                {hasChanges && (
                    <div className={styles.actionButtons}>
                        <button className={styles.saveBtn} onClick={handleSaveChanges}>
                            <i className="fa-solid fa-floppy-disk" /> Save Changes
                        </button>
                        <button className={styles.resetBtn} onClick={handleResetChanges}>
                            <i className="fa-solid fa-rotate-left" /> Reset to Default
                        </button>
                    </div>
                )}
            </div>

            <div className={styles.rolesGrid}>
                {roles.map((role, index) => (
                    <div key={index} className={styles.roleCard} style={{ '--role-color': role.color }}>
                        <div className={styles.roleHeader}>
                            <div className={styles.roleIcon} style={{ background: role.color }}>
                                <i className={`fa-solid ${role.icon}`} />
                            </div>
                            <div className={styles.roleInfo}>
                                <h3>{role.name}</h3>
                                <p>{role.description}</p>
                                {role.configurable && (
                                    <span className={styles.configurableBadge}>
                                        <i className="fa-solid fa-sliders" /> Configurable
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className={styles.permissionsList}>
                            {role.permissions.map((perm, idx) => (
                                <div
                                    key={idx}
                                    className={`${styles.permissionItem} ${perm.granted ? styles.granted : styles.denied} ${perm.highlight ? styles.highlight : ''} ${role.configurable ? styles.clickable : ''}`}
                                    onClick={() => role.configurable && handleTogglePermission(role.name, perm.key)}
                                    style={{ cursor: role.configurable ? 'pointer' : 'default' }}
                                >
                                    <div className={styles.permissionIcon}>
                                        <i className={`fa-solid ${perm.granted ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                                    </div>
                                    <div className={styles.permissionLabel}>
                                        <span>{perm.label}</span>
                                        {perm.note && <small>{perm.note}</small>}
                                    </div>
                                    {role.configurable && (
                                        <div className={styles.toggleIndicator}>
                                            <i className="fa-solid fa-hand-pointer" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className={styles.roleStats}>
                            <div className={styles.stat}>
                                <span className={styles.statValue}>{role.permissions.filter(p => p.granted).length}</span>
                                <span className={styles.statLabel}>Granted</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statValue}>{role.permissions.filter(p => !p.granted).length}</span>
                                <span className={styles.statLabel}>Denied</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.infoSection}>
                <div className={styles.infoCard}>
                    <i className="fa-solid fa-circle-info" />
                    <div>
                        <h4>Permission Hierarchy</h4>
                        <p>Administrator {'>'} Engineer {'>'} Operator {'>'} Viewer. Each role builds upon the previous with additional privileges.</p>
                    </div>
                </div>
                <div className={styles.infoCard}>
                    <i className="fa-solid fa-user-shield" />
                    <div>
                        <h4>Administrator Role</h4>
                        <p>Only Administrators can configure role permissions, manage users, and perform system backups. This role should be assigned sparingly.</p>
                    </div>
                </div>
                <div className={styles.infoCard}>
                    <i className="fa-solid fa-shield" />
                    <div>
                        <h4>Safety Interlocks</h4>
                        <p>Only Engineers and Administrators can override safety interlocks. All override actions are logged in the audit trail with timestamp and user ID.</p>
                    </div>
                </div>
                <div className={styles.infoCard}>
                    <i className="fa-solid fa-clock-rotate-left" />
                    <div>
                        <h4>Audit Logging</h4>
                        <p>All critical actions (cycle control, setpoint changes, user management) are automatically logged and cannot be deleted.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PermissionsTab;