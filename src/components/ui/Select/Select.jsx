'use client';

import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './Select.module.css';

const Select = forwardRef(function Select(
  { label, options = [], error, helperText, icon: Icon, id, required, disabled, value, onChange, placeholder, className, ...rest },
  ref
) {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className={`${styles.wrapper} ${className || ''}`}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={`${styles.selectContainer} ${error ? styles.error : ''} ${disabled ? styles.disabled : ''}`}>
        {Icon && (
          <span className={styles.icon}>
            <Icon size={18} />
          </span>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`${styles.select} ${Icon ? styles.withIcon : ''}`}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className={styles.chevron}>
          <ChevronDown size={18} />
        </span>
      </div>
      {error && (
        <p id={`${selectId}-error`} className={styles.errorText} role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${selectId}-helper`} className={styles.helperText}>
          {helperText}
        </p>
      )}
    </div>
  );
});

export default Select;
