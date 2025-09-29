import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const baseClasses = 'w-full p-3 bg-input border-2 border-border rounded-lg focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring text-foreground';

export const Select: React.FC<SelectProps> = ({ children, className = '', ...props }) => {
    return (
        <select className={`${baseClasses} ${className}`} {...props}>
            {children}
        </select>
    );
};