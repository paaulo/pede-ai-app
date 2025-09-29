import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
}

const baseClasses = 'px-5 py-2.5 font-semibold rounded-md shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed';

const variantClasses: Record<ButtonVariant, string> = {
    primary: 'text-primary-foreground bg-primary hover:bg-primary/90',
    secondary: 'text-secondary-foreground bg-secondary hover:bg-secondary/80',
    danger: 'text-destructive-foreground bg-destructive hover:bg-destructive/90',
    success: 'text-success-foreground bg-success hover:bg-success/90',
    ghost: 'text-foreground bg-transparent shadow-none hover:bg-accent hover:text-accent-foreground'
};

export const Button: React.FC<ButtonProps> = ({ children, className = '', variant = 'primary', ...props }) => {
    return (
        <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};