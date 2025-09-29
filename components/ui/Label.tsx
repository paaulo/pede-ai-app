import React from 'react';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label: React.FC<LabelProps> = ({ children, className = '', ...props }) => {
    return (
        <label className={`block mb-2 text-sm font-medium text-muted-foreground ${className}`} {...props}>
            {children}
        </label>
    );
};