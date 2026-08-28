// src/components/Modals/PinModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import styles from './PinModal.module.css';

// Props:
// isOpen: boolean - Controls visibility
// onClose: function - Called when modal should close (Cancel, background click)
// onSubmit: function(pin) - Called with the entered 4-digit PIN on submit
// title: string (optional) - Modal title
// subtitle: string (optional) - Text below title
// errorMessage: string (optional) - Displayed if PIN is incorrect (pass from parent)
// clearError: function (optional) - Called when user starts typing again

const PinModal = ({
  isOpen,
  onClose,
  onSubmit,
  title = "Enter PIN Code",
  subtitle = "Enter the 4-digit PIN to continue.",
  errorMessage = "",
  clearError // Function to clear error in parent state
}) => {
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const inputRefs = useRef([]); // To store refs for focusing inputs
  const modalContentRef = useRef(null); // Ref for modal content

  // Effect to focus first input when modal opens
  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
    // Reset pin when modal opens/closes if desired
    // setPinDigits(['', '', '', '']);
  }, [isOpen]);

  // Handle clicking outside the modal content to close
  useEffect(() => {
      const handleClickOutside = (event) => {
          if (modalContentRef.current && !modalContentRef.current.contains(event.target)) {
              onClose(); // Call the close handler passed from parent
          }
      };

      if (isOpen) {
          document.addEventListener('mousedown', handleClickOutside);
      } else {
          document.removeEventListener('mousedown', handleClickOutside);
      }

      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
      };
  }, [isOpen, onClose]);


  const handleChange = (e, index) => {
    const { value } = e.target;
    // Only allow single digit
    if (/^[0-9]$/.test(value) || value === '') {
      const newPin = [...pinDigits];
      newPin[index] = value;
      setPinDigits(newPin);

      // Clear error message when user starts typing again
      if (errorMessage && clearError) {
          clearError();
      }

      // Move focus to next input if a digit was entered
      if (value !== '' && index < 3 && inputRefs.current[index + 1]) {
        inputRefs.current[index + 1].focus();
      }
    }
  };

  const handleKeyDown = (e, index) => {
    // Move focus to previous input on backspace if current input is empty
    if (e.key === 'Backspace') {
        // First clear the current input if it's not empty
        if (pinDigits[index] !== '') {
            const newPin = [...pinDigits];
            newPin[index] = '';
            setPinDigits(newPin);
             if (errorMessage && clearError) clearError();
        }
        // Then move focus back if possible
        else if (index > 0 && inputRefs.current[index - 1]) {
            inputRefs.current[index - 1].focus();
        }
    } else if (e.key === 'ArrowLeft' && index > 0) {
        inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
        inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
         handleSubmit(); // Allow submitting with Enter key
    }
  };

  const handleSubmit = () => {
    const enteredPin = pinDigits.join('');
    if (enteredPin.length === 4) {
      onSubmit(enteredPin); // Pass the complete PIN to the parent handler
    } else {
        // Maybe show a local error or rely on parent errorMessage
        console.warn("Please enter all 4 digits");
    }
  };

   const handleCancel = () => {
      setPinDigits(['', '', '', '']); // Clear PIN on cancel
      if (clearError) clearError();
      onClose(); // Call parent close handler
  };

  // Render nothing if modal is not open
  if (!isOpen) {
    return null;
  }

  return (
    // Use portal? For simplicity, render directly for now.
    <div className={styles.modalOverlay}> {/* Apply overlay style */}
      <div className={styles.pinModalContent} ref={modalContentRef}>
        <div className={styles.pinModalHeader}>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className={styles.pinInputContainer}>
          {pinDigits.map((digit, index) => (
            <input
              key={index}
              ref={el => inputRefs.current[index] = el} // Store ref
              type="text" // Use text initially to see digits, change to "password" or "tel" later
              inputMode="numeric" // Hint for mobile numeric keyboard
              maxLength={1}
              className={styles.pinDigit}
              value={digit}
              onChange={(e) => handleChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              aria-label={`PIN Digit ${index + 1}`}
            />
          ))}
        </div>
        {/* Display error message if provided */}
        <p className={styles.pinErrorMessage}>{errorMessage || '\u00A0'}</p> {/* Use non-breaking space to reserve height */}

        <div className={styles.pinModalActions}>
          <button
            type="button"
            className={`${styles.formBtn} ${styles.cancel}`} // Base + specific style
            onClick={handleCancel} // Use specific cancel handler
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.formBtn} ${styles.save}`} // Base + specific style
            onClick={handleSubmit}
            disabled={pinDigits.join('').length !== 4} // Disable if not 4 digits
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinModal;