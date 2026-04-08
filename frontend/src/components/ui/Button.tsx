import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'default' | 'sm';
  children: React.ReactNode;
}

const variantClass: Record<string, string> = {
  primary: 'btn-pr',
  secondary: 'btn-sec',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'default',
  className = '',
  children,
  ...props
}) => {
  const classes = [
    'btn',
    variantClass[variant] || '',
    size === 'sm' ? 'btn-sm' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
};
