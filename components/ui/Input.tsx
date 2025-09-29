import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    // any custom props
}

const baseClasses = 'w-full p-3 bg-input border-2 border-border rounded-lg focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground';

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className = '', ...props }, ref) => {
    return (
        <input ref={ref} className={`${baseClasses} ${className}`} {...props} />
    );
});