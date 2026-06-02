import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div className={`glass-panel rounded-xl p-6 shadow-xl ${className}`}>
      {children}
    </div>
  );
};
