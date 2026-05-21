'use client';

import { useState, useRef, useEffect } from 'react';
import Tag from '@/components/ui/Tag/Tag';
import styles from './TagInput.module.css';

export default function TagInput({ value = [], onChange, suggestions = [], placeholder = 'Type to search...', label, error }) {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!inputValue.trim()) {
      setFiltered([]);
      setShowDropdown(false);
      return;
    }
    const lower = inputValue.toLowerCase();
    const results = suggestions
      .filter((s) => s.name.toLowerCase().includes(lower) && !value.includes(s.name))
      .slice(0, 8);
    setFiltered(results);
    setShowDropdown(results.length > 0 || inputValue.trim().length > 0);
  }, [inputValue, suggestions, value]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const addTag = (name) => {
    if (!name.trim() || value.includes(name.trim())) return;
    onChange([...value, name.trim()]);
    setInputValue('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const removeTag = (name) => {
    onChange(value.filter((v) => v !== name));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0) {
        addTag(filtered[0].name);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    }
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const showCustomOption = inputValue.trim() &&
    !filtered.some((s) => s.name.toLowerCase() === inputValue.toLowerCase()) &&
    !value.includes(inputValue.trim());

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      {label && (
        <label className={styles.label}>
          {label}
        </label>
      )}
      <div className={`${styles.container} ${error ? styles.error : ''}`}>
        {value.length > 0 && (
          <div className={styles.tags}>
            {value.map((tag) => (
              <Tag key={tag} onRemove={() => removeTag(tag)} variant="primary">
                {tag}
              </Tag>
            ))}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => inputValue.trim() && setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : 'Add more...'}
          autoComplete="off"
        />
      </div>

      {showDropdown && (
        <div className={styles.dropdown}>
          {filtered.map((s) => (
            <button
              key={s.id || s.name}
              type="button"
              className={styles.dropdownItem}
              onClick={() => addTag(s.name)}
            >
              {s.name}
            </button>
          ))}
          {showCustomOption && (
            <button
              type="button"
              className={`${styles.dropdownItem} ${styles.customItem}`}
              onClick={() => addTag(inputValue)}
            >
              Add &quot;{inputValue.trim()}&quot;
            </button>
          )}
        </div>
      )}

      {error && (
        <p className={styles.errorText} role="alert">{error}</p>
      )}
    </div>
  );
}
