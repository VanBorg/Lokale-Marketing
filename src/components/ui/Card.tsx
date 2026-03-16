import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({
  children,
  className = '',
  hover = false,
  onClick,
}: CardProps) {
  return (
    <div
      className={`
        rounded-xl bg-dark-card border border-dark-border p-5
        ${hover ? 'cursor-pointer transition-all duration-200 hover:border-accent/40 hover:bg-dark-hover hover:shadow-lg hover:shadow-accent/5' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
