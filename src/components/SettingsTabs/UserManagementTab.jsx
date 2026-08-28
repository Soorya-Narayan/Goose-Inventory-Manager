// src/components/SettingsTabs/UserManagementTab.jsx
import React, { useState } from 'react';
import styles from './UserManagementTab.module.css';

const UserManagementTab = ({ settings, updateSettings }) => {
  const users = settings?.users || [];
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Operator' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      const updatedUsers = users.filter(u => u.id !== id);
      updateSettings({ ...settings, users: updatedUsers });
    }
  };

  const handleAdd = () => {
    if (!newUser.name || !newUser.email) {
      alert('Please fill in all fields');
      return;
    }
    const newId = Math.max(...users.map(u => u.id), 0) + 1;
    const updatedUsers = [...users, { ...newUser, id: newId, status: 'active', lastLogin: 'Never' }];
    updateSettings({ ...settings, users: updatedUsers });
    setIsAdding(false);
    setNewUser({ name: '', email: '', role: 'Operator' });
  };

  const getRoleColor = (role) => {
    const colors = {
      'Administrator': '#8b5cf6',
      'Engineer': '#3b82f6',
      'Operator': '#10b981',
      'Viewer': '#64748b'
    };
    return colors[role] || '#64748b';
  };

  const getRoleIcon = (role) => {
    const icons = {
      'Administrator': 'fa-user-shield',
      'Engineer': 'fa-user-gear',
      'Operator': 'fa-user-check',
      'Viewer': 'fa-user'
    };
    return icons[role] || 'fa-user';
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    administrator: users.filter(u => u.role === 'Administrator').length,
    engineer: users.filter(u => u.role === 'Engineer').length,
    operator: users.filter(u => u.role === 'Operator').length,
    viewer: users.filter(u => u.role === 'Viewer').length
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h2><i className="fa-solid fa-users" /> User Management</h2>
          <p>Manage team access and roles for CIPoptima™</p>
        </div>
        <button className={styles.addUserBtn} onClick={() => setIsAdding(!isAdding)}>
          <i className={`fa-solid ${isAdding ? 'fa-times' : 'fa-user-plus'}`} />
          {isAdding ? 'Cancel' : 'Add New User'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
            <i className="fa-solid fa-users" />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.total}</span>
            <span className={styles.statLabel}>Total Users</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <i className="fa-solid fa-circle-check" />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.active}</span>
            <span className={styles.statLabel}>Active</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
            <i className="fa-solid fa-user-shield" />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.administrator}</span>
            <span className={styles.statLabel}>Administrators</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <i className="fa-solid fa-user-gear" />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.engineer}</span>
            <span className={styles.statLabel}>Engineers</span>
          </div>
        </div>
      </div>

      {/* Add User Form */}
      {isAdding && (
        <div className={styles.addUserForm}>
          <h3><i className="fa-solid fa-user-plus" /> Add New User</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label><i className="fa-solid fa-user" /> Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={newUser.name}
                onChange={e => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label><i className="fa-solid fa-envelope" /> Email Address</label>
              <input
                type="email"
                placeholder="john.doe@company.com"
                value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label><i className="fa-solid fa-shield-halved" /> Role</label>
              <select
                value={newUser.role}
                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="Administrator">Administrator</option>
                <option value="Engineer">Engineer</option>
                <option value="Operator">Operator</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
          </div>
          <div className={styles.formActions}>
            <button className={styles.submitBtn} onClick={handleAdd}>
              <i className="fa-solid fa-check" /> Create User
            </button>
            <button className={styles.cancelBtn} onClick={() => setIsAdding(false)}>
              <i className="fa-solid fa-times" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className={styles.roleFilter}
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="Administrator">Administrator</option>
          <option value="Engineer">Engineer</option>
          <option value="Operator">Operator</option>
          <option value="Viewer">Viewer</option>
        </select>
      </div>

      {/* User Cards */}
      <div className={styles.usersGrid}>
        {filteredUsers.map(user => (
          <div key={user.id} className={styles.userCard}>
            <div className={styles.userHeader}>
              <div className={styles.userAvatar} style={{ background: getRoleColor(user.role) }}>
                {getInitials(user.name)}
              </div>
              <div className={styles.userInfo}>
                <h4>{user.name}</h4>
                <p>{user.email}</p>
              </div>
              <button className={styles.deleteBtn} onClick={() => handleDelete(user.id)}>
                <i className="fa-solid fa-trash" />
              </button>
            </div>
            <div className={styles.userDetails}>
              <div className={styles.userRole}>
                <i className={`fa-solid ${getRoleIcon(user.role)}`} style={{ color: getRoleColor(user.role) }} />
                <span style={{ color: getRoleColor(user.role) }}>{user.role}</span>
              </div>
              <div className={styles.userStatus}>
                <span className={`${styles.statusBadge} ${styles[user.status]}`}>
                  <i className="fa-solid fa-circle" />
                  {user.status}
                </span>
              </div>
            </div>
            <div className={styles.userFooter}>
              <span className={styles.lastLogin}>
                <i className="fa-solid fa-clock" />
                Last login: {user.lastLogin}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className={styles.emptyState}>
          <i className="fa-solid fa-users-slash" />
          <h3>No users found</h3>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
};

export default UserManagementTab;
