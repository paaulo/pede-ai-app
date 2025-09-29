import React from 'react';

interface ErrorMessageProps {
    children?: React.ReactNode;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ children }) => {
    if (!children) return null;
    return (
        <p className="mt-1 text-sm text-red-600">
            {children}
        </p>
    );
};
