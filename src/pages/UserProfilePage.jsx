// src/pages/UserProfilePage.jsx
import React, { useState, useEffect } from 'react';
import styles from './UserProfilePage.module.css';
import ChangePasswordModal from '../components/Modals/ChangePasswordModal';

const UserProfilePage = () => {
  const API_BASE_URL = window.API_BASE_URL || '/api';

  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const fileInputRef = React.useRef(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    bio: ''
  });

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/profile`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setEditForm({
            name: data.name || '',
            email: data.email || '',
            bio: data.bio || ''
          });
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchActivity = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/profile/activity`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities || []);
        }
      } catch (err) {
        console.error('Failed to fetch activity:', err);
      }
    };

    fetchProfile();
    fetchActivity();
  }, [API_BASE_URL]);

  const handleEditToggle = () => {
    if (editMode) {
      // Cancel - reset form
      setEditForm({
        name: profile.name || '',
        email: profile.email || '',
        bio: profile.bio || ''
      });
    }
    setEditMode(!editMode);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, id: profile.id })
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(prev => ({ ...prev, ...editForm }));
        setEditMode(false);
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Image = event.target.result;

      try {
        setSaving(true);
        const res = await fetch(`${API_BASE_URL}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: profile.id, avatar: base64Image })
        });

        if (res.ok) {
          setProfile(prev => ({ ...prev, avatar: base64Image }));
        }
      } catch (err) {
        console.error('Failed to upload avatar:', err);
        alert('Failed to upload avatar');
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHrs < 1) return 'Just now';
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return <div className="page"><div className={styles.loading}>Loading profile...</div></div>;
  }

  if (!profile) {
    return <div className="page"><div className={styles.error}>Failed to load profile</div></div>;
  }

  return (
    <div className="page">
      {/* Header Banner */}
      <div className={styles.profileBanner}>
        <div className={styles.bannerGradient}></div>
        <div className={styles.bannerContent}>
          <div className={styles.avatarSection}>
            <div className={styles.avatarWrapper} onClick={handleAvatarClick} style={{ cursor: 'pointer' }}>
              <img
                src={profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&size=200&background=3b82f6&color=fff`}
                alt={profile.name}
              />
              <div className={styles.avatarOverlay}>
                <i className="fa-solid fa-camera"></i>
              </div>
              <div className={styles.statusDot}></div>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />

            <div className={styles.userInfo}>
              {!editMode ? (
                <>
                  <h1>{profile.name}</h1>
                  <p className={styles.role}>{profile.role}</p>
                  <p className={styles.bio}>{profile.bio || 'CIP System Operator'}</p>
                </>
              ) : (
                <div className={styles.editFields}>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Full Name"
                  />
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="Email"
                  />
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Bio (optional)"
                    rows="2"
                  />
                </div>
              )}
            </div>
          </div>

          <div className={styles.headerActions}>
            {!editMode ? (
              <>
                <button className={styles.editBtn} onClick={handleEditToggle}>
                  <i className="fa-solid fa-pen"></i> Edit Profile
                </button>
                <button className={styles.passwordBtn} onClick={() => setIsPasswordModalOpen(true)}>
                  <i className="fa-solid fa-lock"></i> Change Password
                </button>
              </>
            ) : (
              <>
                <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                  <i className="fa-solid fa-check"></i> {saving ? 'Saving...' : 'Save'}
                </button>
                <button className={styles.cancelBtn} onClick={handleEditToggle} disabled={saving}>
                  <i className="fa-solid fa-xmark"></i> Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className={styles.contentGrid}>
        {/* Stats Cards */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
              <i className="fa-solid fa-play-circle"></i>
            </div>
            <div className={styles.statContent}>
              <h3>{profile.stats?.cyclesInitiated || 0}</h3>
              <p>Cycles Run</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <i className="fa-solid fa-check-circle"></i>
            </div>
            <div className={styles.statContent}>
              <h3>{profile.stats?.alarmsAcknowledged || 0}</h3>
              <p>Alarms Ack'd</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
              <i className="fa-solid fa-chart-line"></i>
            </div>
            <div className={styles.statContent}>
              <h3>{profile.stats?.avgSuccessRate || 'N/A'}</h3>
              <p>Success Rate</p>
            </div>
          </div>
        </div>

        {/* Info and Activity */}
        <div className={styles.twoColumnGrid}>
          {/* Profile Details */}
          <div className={`dashboard-card ${styles.infoCard}`}>
            <h3><i className="fa-solid fa-user"></i> Profile Information</h3>
            <div className={styles.infoRow}>
              <span>Email</span>
              <strong>{profile.email || 'N/A'}</strong>
            </div>
            <div className={styles.infoRow}>
              <span>Role</span>
              <strong>{profile.role}</strong>
            </div>
            <div className={styles.infoRow}>
              <span>Last Login</span>
              <strong>{profile.stats?.lastLogin ? new Date(profile.stats.lastLogin).toLocaleDateString() : 'N/A'}</strong>
            </div>

            <h3 style={{ marginTop: '24px' }}><i className="fa-solid fa-desktop"></i> Current Session</h3>
            <div className={styles.infoRow}>
              <span>IP Address</span>
              <strong>{profile.session?.ip || 'N/A'}</strong>
            </div>
            <div className={styles.infoRow}>
              <span>Device</span>
              <strong>{profile.session?.device || 'N/A'}</strong>
            </div>
            <div className={styles.infoRow}>
              <span>Login Time</span>
              <strong>{profile.session?.loginTime ? formatTimeAgo(profile.session.loginTime) : 'N/A'}</strong>
            </div>
          </div>

          {/* Activity Feed */}
          <div className={`dashboard-card ${styles.activityCard}`}>
            <h3><i className="fa-solid fa-clock-rotate-left"></i> Recent Activity</h3>
            <div className={styles.activityFeed}>
              {activities.map(activity => (
                <div key={activity.id} className={styles.activityItem}>
                  <div className={styles.activityIcon}>
                    <i className={activity.icon}></i>
                  </div>
                  <div className={styles.activityContent}>
                    <p className={styles.activityAction}>{activity.action}</p>
                    <p className={styles.activityDetail}>{activity.detail}</p>
                    <span className={styles.activityTime}>{formatTimeAgo(activity.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSave={async (passwordData) => {
          console.log('Password change requested');
          setIsPasswordModalOpen(false);
        }}
      />
    </div>
  );
};

export default UserProfilePage;