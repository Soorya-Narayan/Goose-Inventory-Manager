// src/components/Modals/ChangePasswordModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './ModalStyles.module.css'; // Use the shared modal styles

// Props:
// isOpen: boolean
// onClose: function
// onSave: function({ currentPassword, newPassword }) - Passes password data to parent for API call

const ChangePasswordModal = ({ isOpen, onClose, onSave }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const modalContentRef = useRef(null);
  const currentPasswordInputRef = useRef(null); // Ref to focus first input

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset fields when opening
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setError('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      // Focus after a short delay to ensure modal is rendered
      setTimeout(() => currentPasswordInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle closing modal on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalContentRef.current && !modalContentRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    // Validations
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setError('Please fill in all password fields.');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }
    
    if (newPassword === currentPassword) {
      setError('New password cannot be the same as the current password.');
      return;
    }

    // Call the onSave prop function passed from parent (e.g., UserProfilePage)
    // The parent will handle the API call and potential errors from the backend
    onSave({ currentPassword, newPassword });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} ref={modalContentRef}>
        <div className={styles.modalHeader}>
          <h2>Change Your Password</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close modal">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Current Password */}
          <div className={styles.formGroup}>
            <label htmlFor="change-password-current">Current Password</label>
            <div style={{ position: 'relative' }}>
              <input
                ref={currentPasswordInputRef} // Ref for initial focus
                type={showCurrentPassword ? "text" : "password"}
                id="change-password-current"
                name="currentPassword"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setError(''); // Clear error on input change
                }}
                required
                autoComplete="current-password"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: '14px'
                }}
                aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
              >
                <i className={`fa-solid ${showCurrentPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className={styles.formGroup}>
            <label htmlFor="change-password-new">New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPassword ? "text" : "password"}
                id="change-password-new"
                name="newPassword"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError('');
                }}
                required
                autoComplete="new-password"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: '14px'
                }}
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
              >
                <i className={`fa-solid ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
            <small style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Must be at least 6 characters long
            </small>
          </div>

          {/* Confirm New Password */}
          <div className={styles.formGroup}>
            <label htmlFor="change-password-confirm">Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="change-password-confirm"
                name="confirmNewPassword"
                value={confirmNewPassword}
                onChange={(e) => {
                  setConfirmNewPassword(e.target.value);
                  setError('');
                }}
                required
                autoComplete="new-password"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: '14px'
                }}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          {/* Error Message Display */}
          {error && <p className={styles.pinErrorMessage}>{error}</p>}

          {/* Form Actions */}
          <div className={styles.formActions}>
            <button type="button" className={`${styles.formBtn} ${styles.cancel}`} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={`${styles.formBtn} ${styles.save}`}>
              Change Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;