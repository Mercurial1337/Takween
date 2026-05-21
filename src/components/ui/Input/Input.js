'use client';

import { forwardRef, useId } from 'react';
import styles from './Input.module.css';

const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    icon: Icon,
    leftElement,
    rightElement,
    type = 'text',
    id: propId,
    required = false,
    disabled = false,
    className = '',
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const inputId = propId || generatedId;

  const inputClasses = [
    styles.input,
    Icon ? styles.hasIcon : '',
    leftElement ? styles.hasLeftElement : '',
    rightElement ? styles.hasRightElement : '',
    error ? styles.inputError : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}

      <div className={styles.inputContainer}>
        {Icon && !leftElement && (
          <span className={styles.iconWrapper}>
            <Icon size={18} />
          </span>
        )}
        {leftElement && (
          <span className={styles.leftElementWrapper}>
            {leftElement}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          required={required}
          className={inputClasses}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...rest}
        />
        {rightElement && (
          <span className={styles.rightElementWrapper}>
            {rightElement}
          </span>
        )}
      </div>

      {error && (
        <span id={`${inputId}-error`} className={styles.errorMessage} role="alert">
          {error}
        </span>
      )}

      {!error && helperText && (
        <span id={`${inputId}-helper`} className={styles.helperText}>
          {helperText}
        </span>
      )}
    </div>
  );
});

export default Input;
