import React from 'react';
import { Label } from './Label';
import { ErrorMessage } from './ErrorMessage';

interface FormGroupProps {
    label: string;
    htmlFor?: string;
    error?: string;
    children: React.ReactNode;
    className?: string;
}

export const FormGroup: React.FC<FormGroupProps> = ({ label, htmlFor, error, children, className = '' }) => {
    return (
        <div className={`form-group ${className}`}>
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            <ErrorMessage>{error}</ErrorMessage>
        </div>
    );
};
