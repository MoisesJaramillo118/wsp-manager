import React from 'react';
import { useUiStore } from '../../stores/uiStore';

export const LoadingBar: React.FC = () => {
  const loadingCount = useUiStore((s) => s.loadingCount);

  if (loadingCount <= 0) return null;

  return (
    <div className="loading-bar" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      zIndex: 300,
      background: 'linear-gradient(90deg, #f472b6, #ec4899, #db2777)',
      animation: 'loadingSlide 1.2s ease-in-out infinite',
    }} />
  );
};
