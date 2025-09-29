import React from 'react';
import { Card } from './Card';

interface StatCardProps {
    title: string;
    children: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ title, children }) => {
    return (
        <Card>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</h3>
            <div className="mt-2 text-3xl font-bold text-foreground">{children}</div>
        </Card>
    );
};