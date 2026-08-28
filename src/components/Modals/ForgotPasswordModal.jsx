// src/components/Modals/ForgotPasswordModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext'; // Import context
import styles from './ModalStyles.module.css'; // Use shared modal styles

// Props:
// isOpen: boolean
// onClose: function

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  // *** Get requestPasswordReset function from context ***
  const { showToast, requestPasswordReset } = useAppContext();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false); // State for loading indicator
  const modalContentRef = useRef(null);
  const emailInputRef = useRef(null); // Ref to focus email input

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail(''); // Reset field
      setIsLoading(false); // Reset loading state
      setTimeout(() => emailInputRef.current?.focus(), 100); // Focus after a short delay
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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || isLoading) return;

    setIsLoading(true);
    console.log(`Requesting password reset for: ${email}`);

    // *** Call the context function ***
    try {
      // requestPasswordReset handles API call, shows toast, returns success status
      const result = await requestPasswordReset(email);
      if (result?.success) {
        onClose(); // Close modal on success (context function shows toast)
      }
      // If requestPasswordReset fails, it throws an error and shows a toast
    } catch (error) {
      // Catch error to prevent unhandled promise rejection, but toast is already shown
      console.error("Forgot password submit failed:", error);
      // Keep modal open on error for user feedback
    } finally {
      setIsLoading(false); // Stop loading indicator regardless of success/fail
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
          <h2>Reset Password</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close modal">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <p className={styles.modalText}>
            Enter your email address or username and we'll send a link to get back into your account.
          </p>

          {/* Email Address */}
          <div className={styles.formGroup}>
            <label htmlFor="forgot-modal-email">Email Address or Username</label> {/* Updated label */}
            <input
              ref={emailInputRef}
              type="text" // Allow username or email
              id="forgot-modal-email"
              name="email" // Keep name 'email' as backend expects it
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username email" // Allow browser hints
              disabled={isLoading}
            />
          </div>

          {/* Form Actions */}
          <div className={styles.formActions}>
            <button
              type="button"
              className={`${styles.formBtn} ${styles.cancel}`}
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.formBtn} ${styles.save}`}
              disabled={isLoading || !email}
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;