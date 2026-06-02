import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input: React.FC<InputProps> = ({ className = '', ...props }) => {
  return (
    <input
      className={`w-full bg-card/50 border border-border rounded-md px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${className}`}
      {...props}
    />
  );
};
