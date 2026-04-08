import React from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Buscar...',
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      <svg
        width="14"
        height="14"
        fill="none"
        stroke="#9aa5b4"
        strokeWidth="2"
        viewBox="0 0 24 24"
        style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-xs"
        style={{ paddingLeft: 32 }}
      />
    </div>
  );
};
