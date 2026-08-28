// src/components/Modals/UserModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './ModalStyles.module.css'; // Create a shared CSS module for modals

// Props:
// isOpen: boolean - Controls visibility
// onClose: function - Called when modal should close (Cancel, X, background click)
// onSave: function(userData) - Called with form data on save
// user: object | null - User object for editing, or null for adding a new user

const UserModal = ({ isOpen, onClose, onSave, user }) => {
  // State for form fields
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    username: '',
    email: '', // Added email field
    role: 'Operator', // Default role
    password: '', // Only used for adding or resetting password
  });
  const modalContentRef = useRef(null);

  // Effect to populate form when editing an existing user
  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        id: user.id || '',
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        role: user.role || 'Operator',
        password: '', // Clear password field when editing
      });
    } else if (!user && isOpen) {
      // Reset form when opening for 'Add New'
      setFormData({
        id: '', name: '', username: '', email: '', role: 'Operator', password: ''
      });
    }
  }, [user, isOpen]); // Rerun when user object or isOpen changes

  // Handle clicking outside the modal content to close
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Basic validation (add more as needed)
    if (!formData.name || !formData.username || !formData.email || !formData.role) {
      alert('Please fill in Name, Username, Email, and Role.'); // Replace with better error handling later
      return;
    }
    if (!formData.id && !formData.password) { // Require password only when adding new user
        alert('Please enter a password for the new user.');
        return;
    }
    // Password confirmation could be added here

    onSave(formData); // Pass the form data to the parent save handler
  };

  // Render nothing if modal is not open
  if (!isOpen) {
    return null;
  }

  const modalTitle = user ? 'Edit User' : 'Add New User';

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} ref={modalContentRef}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <h2>{modalTitle}</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close modal">&times;</button>
        </div>

        {/* User Form */}
        <form onSubmit={handleSubmit}>
          {/* Hidden input for ID if editing */}
          {user && <input type="hidden" name="id" value={formData.id} />}

          {/* Full Name */}
          <div className={styles.formGroup}>
            <label htmlFor="user-modal-name">Full Name</label>
            <input
              type="text"
              id="user-modal-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              autoComplete="name"
            />
          </div>

          {/* Username */}
          <div className={styles.formGroup}>
            <label htmlFor="user-modal-username">Username</label>
            <input
              type="text"
              id="user-modal-username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </div>

           {/* Email */}
           <div className={styles.formGroup}>
            <label htmlFor="user-modal-email">Email</label>
            <input
              type="email"
              id="user-modal-email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          {/* Role */}
          <div className={styles.formGroup}>
            <label htmlFor="user-modal-role">Role</label>
            <select
              id="user-modal-role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              {/* These roles should ideally come from PERMISSIONS keys */}
              <option value="Operator">Operator</option>
              <option value="QA/Supervisor">QA/Supervisor</option>
              <option value="Administrator">Administrator</option>
            </select>
          </div>

          {/* Password (for add or reset) */}
          <div className={styles.formGroup}>
            <label htmlFor="user-modal-password">Password</label>
            <input
              type="password"
              id="user-modal-password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={user ? "Leave blank to keep current password" : "Required for new user"}
              required={!user} // Only required when adding
              autoComplete="new-password"
            />
            {/* Add password confirmation input if desired */}
          </div>

          {/* Form Actions */}
          <div className={styles.formActions}>
            <button type="button" className={`${styles.formBtn} ${styles.cancel}`} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={`${styles.formBtn} ${styles.save}`}>
              Save User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;