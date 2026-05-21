'use client';

import styles from './Skeleton.module.css';

export default function Skeleton({
  variant = 'text',
  width,
  height,
  count = 1,
  className = '',
  ...rest
}) {
  const resolvedHeight =
    height || (variant === 'text' ? 14 : variant === 'circular' ? 40 : 100);
  const resolvedWidth =
    width || (variant === 'circular' ? resolvedHeight : '100%');

  const skeletonStyle = {
    width: typeof resolvedWidth === 'number' ? `${resolvedWidth}px` : resolvedWidth,
    height: typeof resolvedHeight === 'number' ? `${resolvedHeight}px` : resolvedHeight,
  };

  const classNames = [styles.skeleton, styles[variant], className]
    .filter(Boolean)
    .join(' ');

  if (count > 1) {
    return (
      <div className={styles.container} {...rest}>
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className={classNames}
            style={{
              ...skeletonStyle,
              // Vary width slightly for text lines to look natural
              width:
                variant === 'text' && i === count - 1
                  ? '75%'
                  : skeletonStyle.width,
            }}
          />
        ))}
      </div>
    );
  }

  return <div className={classNames} style={skeletonStyle} {...rest} />;
}
