import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
    return (
        <div className={`bg-card text-card-foreground border border-border rounded-lg shadow p-6 ${className}`}>
            {children}
        </div>
    );
};