import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const baseClasses = 'w-full p-3 bg-input border-2 border-border rounded-lg focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground';

export const Textarea: React.FC<TextareaProps> = ({ className = '', ...props }) => {
    return (
        <textarea className={`${baseClasses} ${className}`} {...props} />
    );
};