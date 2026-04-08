import React from 'react';

interface BadgeProps {
  variant?: 'mint' | 'petrol' | 'red' | 'amber' | 'gray' | 'green' | 'pink';
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const variantClass: Record<string, string> = {
  mint: 'badge-mint',
  petrol: 'badge-petrol',
  red: 'badge-red',
  amber: 'badge-amber',
  gray: 'badge-gray',
  green: 'badge-green',
  pink: 'badge-pink',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'gray',
  className = '',
  style,
  children,
}) => {
  const classes = ['badge', variantClass[variant] || '', className].filter(Boolean).join(' ');
  return (
    <span className={classes} style={style}>
      {children}
    </span>
  );
};
