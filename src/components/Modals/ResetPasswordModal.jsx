// src/components/Modals/ResetPasswordModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext'; // To call API, showToast
import styles from './ModalStyles.module.css'; // Use shared modal styles

// Props:
// isOpen: boolean - Controls visibility
// onClose: function - Called when modal should close (usually after success)
// token: string - The reset token from the URL

const ResetPasswordModal = ({ isOpen, onClose, token }) => {
  // *** Get resetPasswordWithToken function from context ***
  const { showToast, resetPasswordWithToken } = useAppContext();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const modalContentRef = useRef(null);
  const newPasswordInputRef = useRef(null); // Ref to focus first input

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset fields when opening
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setIsLoading(false);
      // Focus after a short delay
      setTimeout(() => newPasswordInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle outside click (Optional)
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Decide if closing on outside click makes sense. Usually not for reset.
      // if (modalContentRef.current && !modalContentRef.current.contains(event.target)) {
      //   onClose();
      // }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    if (!newPassword || !confirmPassword || isLoading) return;

    // Basic Validations
    if (newPassword.length < 6) { // Example: Enforce minimum length
        setError('Password must be at least 6 characters long.');
        return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    console.log(`Attempting to reset password with token: ${token}`);

    // *** Call the context function ***
    try {
        // Call context function, passing the token (from props) and new password
        const result = await resetPasswordWithToken(token, newPassword);
        if (result?.success) {
            onClose(); // Close modal on success (context shows toast)
        }
        // If it fails, context throws error, caught below
    } catch (error) {
        console.error("Reset password submit failed:", error);
        // Set local error state to display in the modal
        setError(error.message || "Failed to reset password. Link may be invalid/expired.");
        // Context function also shows a toast
    } finally {
        setIsLoading(false);
    }
    // *** End context function call ***
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} ref={modalContentRef}>
        <div className={styles.modalHeader}>
          <h2>Choose a New Password</h2>
          {/* Usually no close 'X' button here */}
        </div>

        <form onSubmit={handleSubmit}>
          {/* New Password */}
          <div className={styles.formGroup}>
            <label htmlFor="reset-modal-new-password">New Password</label>
            <input
              ref={newPasswordInputRef}
              type="password"
              id="reset-modal-new-password"
              name="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6} // Enforce in HTML too
              autoComplete="new-password"
              disabled={isLoading}
            />
          </div>

          {/* Confirm New Password */}
          <div className={styles.formGroup}>
            <label htmlFor="reset-modal-confirm-password">Confirm New Password</label>
            <input
              type="password"
              id="reset-modal-confirm-password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              disabled={isLoading}
            />
          </div>

          {/* Error Message Display */}
          {error && <p className={styles.pinErrorMessage}>{error}</p>} {/* Reuse PIN error style */}

          {/* Form Actions */}
          <div className={styles.formActions} style={{ justifyContent: 'center' }}> {/* Center button */}
            <button
              type="submit"
              className={`${styles.formBtn} ${styles.save}`}
              style={{ width: '100%' }} // Make button full width
              disabled={isLoading || !newPassword || !confirmPassword}
            >
              {isLoading ? 'Saving...' : 'Save New Password'}
            </button>
            {/* Usually no Cancel button here */}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordModal;