import React, { useState } from 'react';
import { db } from '../services/db';
import { CurrentUser } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { FormGroup } from './ui/FormGroup';

interface AuthProps {
    onLogin: (user: CurrentUser) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const toggleMode = () => {
        setMode(prev => (prev === 'login' ? 'register' : 'login'));
        setMessage('');
        setError('');
        setEmail('');
        setUsername('');
        setPassword('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (mode === 'register') {
            if (!email || !username || !password) {
                setError('Preencha todos os campos.');
                return;
            }
            const users = db.getUsers();
            if (users.some(u => u.email === email)) {
                setError('E-mail já cadastrado.');
                return;
            }
             if (users.some(u => u.username === username)) {
                setError('Nome de usuário já existe.');
                return;
            }
            const newUser = {
                id: crypto.randomUUID(),
                email,
                username,
                password,
                role: username.toLowerCase() === 'admin' ? 'admin' as const : 'user' as const,
            };
            db.saveUsers([...users, newUser]);
            setMessage('Conta criada com sucesso. Faça login.');
            setMode('login');
        } else { // login
             if (!username || !password) {
                setError('Preencha o usuário e a senha.');
                return;
            }
            const users = db.getUsers();
            const user = users.find(u => u.username === username && u.password === password);
            if (!user) {
                setError('Credenciais inválidas.');
                return;
            }
            const currentUser: CurrentUser = { id: user.id, username: user.username, role: user.role };
            onLogin(currentUser);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg border border-border shadow-lg">
                <h2 className="text-3xl font-bold text-center text-card-foreground">
                    {mode === 'login' ? 'Entrar' : 'Criar conta'}
                </h2>
                {message && <div className="p-3 text-sm text-success-foreground bg-success/20 border border-success/30 rounded-lg">{message}</div>}
                {error && <div className="p-3 text-sm text-destructive-foreground bg-destructive/20 border border-destructive/30 rounded-lg">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'register' && (
                        <FormGroup label="E-mail" htmlFor="email">
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@exemplo.com"
                            />
                        </FormGroup>
                    )}
                    <FormGroup label="Usuário" htmlFor="username">
                        <Input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="usuário"
                        />
                    </FormGroup>
                    <FormGroup label="Senha" htmlFor="password">
                         <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </FormGroup>
                    <Button type="submit" className="w-full !py-3">
                        {mode === 'login' ? 'Entrar' : 'Cadastrar'}
                    </Button>
                </form>
                <div className="text-sm text-center text-muted-foreground">
                    {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}
                    <button onClick={toggleMode} className="ml-1 font-semibold text-primary hover:underline">
                        {mode === 'login' ? 'Criar conta' : 'Entrar'}
                    </button>
                </div>
            </div>
        </div>
    );
};