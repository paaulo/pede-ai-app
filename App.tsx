import React, { useState, useEffect } from 'react';
import { db } from './services/db';
import { Auth } from './components/Auth';
import { LancamentoForm } from './components/LancamentoForm';
import { AdminPanel } from './components/admin/AdminPanel';
import { CurrentUser } from './types';
import { Button } from './components/ui/Button';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(db.getCurrentUser());
    const [activeTab, setActiveTab] = useState<'lancamentos' | 'admin'>('lancamentos');

    useEffect(() => {
        const user = db.getCurrentUser();
        setCurrentUser(user);
        // Default to 'lancamentos' tab if user is not an admin, or if they are but were on the admin tab
        if (user && user.role === 'user') {
            setActiveTab('lancamentos');
        }
    }, []);

    const handleLogin = (user: CurrentUser) => {
        db.setCurrentUser(user);
        setCurrentUser(user);
        if (user.role === 'user') {
            setActiveTab('lancamentos');
        }
    };

    const handleLogout = () => {
        db.setCurrentUser(null);
        setCurrentUser(null);
    };

    if (!currentUser) {
        return <Auth onLogin={handleLogin} />;
    }

    return (
        <div className="min-h-screen">
            <div className="container mx-auto p-2 sm:p-4 md:p-8">
                <div className="bg-card rounded-lg border border-border shadow-lg">
                    <header className="p-4 sm:px-8 sm:py-4 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Sistema de Lançamentos</h1>
                        <div className="flex items-center gap-4">
                            <span className="text-sm sm:text-base text-muted-foreground">Olá, {currentUser.username}</span>
                            <button onClick={handleLogout} className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition">
                                Sair
                            </button>
                        </div>
                    </header>
                    <main>
                         <div className="p-4 sm:p-8 border-b border-border">
                            <div className="flex space-x-2 bg-secondary p-1 rounded-lg w-fit">
                                <Button
                                    onClick={() => setActiveTab('lancamentos')}
                                    variant={activeTab === 'lancamentos' ? 'primary' : 'ghost'}
                                    className="py-2 shadow-none"
                                >
                                    Lançamentos
                                </Button>
                                {(currentUser.role === 'admin' || currentUser.role === 'super-admin') && (
                                     <Button
                                        onClick={() => setActiveTab('admin')}
                                        variant={activeTab === 'admin' ? 'primary' : 'ghost'}
                                        className="py-2 shadow-none"
                                     >
                                        Admin
                                    </Button>
                                )}
                            </div>
                         </div>
                        {activeTab === 'lancamentos' && <LancamentoForm currentUser={currentUser} />}
                        {activeTab === 'admin' && (currentUser.role === 'admin' || currentUser.role === 'super-admin') && <AdminPanel currentUser={currentUser} />}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default App;
