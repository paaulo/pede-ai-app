import { User, CurrentUser, Lancamento, Produto, UserRole, Cliente, ImportLog } from '../types';
import { PRODUTOS } from '../constants';

const DB_KEYS = {
    USERS: 'db_users',
    CURRENT_USER: 'db_currentUser',
    LANCAMENTOS: 'db_lancamentos',
    CLIENTES: 'db_clientes',
    IMPORT_LOGS: 'db_import_logs',
};

// --- Helper Functions ---
function getItem<T>(key: string, defaultValue: T): T {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage key “${key}”:`, error);
        return defaultValue;
    }
}

function setItem<T>(key: string, value: T): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error writing to localStorage key “${key}”:`, error);
    }
}

// --- Seeding ---
function seedDefaultUsers(): void {
    const users = getItem<User[]>(DB_KEYS.USERS, []);
    const ensure = (email: string, username: string, password: string, role: UserRole) => {
        if (!users.some(u => u.email === email)) {
            users.push({ id: crypto.randomUUID(), email, username, password, role });
        } else {
            // Ensure the main admin is always a super-admin
            const adminUser = users.find(u => u.username === 'admin');
            if (adminUser && adminUser.role !== 'super-admin') {
                adminUser.role = 'super-admin';
            }
        }
    };
    ensure('user@example.com', 'user', '123456', 'user');
    ensure('admin@example.com', 'admin', 'AdminPaaulo1609Pr', 'super-admin');
    ensure('sup100@example.com', 'sup100', 'Sup100North', 'admin');
    ensure('sup200@example.com', 'sup200', 'Sup200North', 'admin');
    ensure('gv10@example.com', 'gv10', 'Gv10North', 'admin');
    ensure('101@example.com', '101', '101North', 'user');
    ensure('102@example.com', '102', '102North', 'user');
    ensure('103@example.com', '103', '103North', 'user');
    ensure('104@example.com', '104', '104North', 'user');
    ensure('105@example.com', '105', '105North', 'user');
    ensure('106@example.com', '106', '106North', 'user');
    ensure('110@example.com', '110', '110North', 'user');
    ensure('201@example.com', '201', '201North', 'user');
    ensure('202@example.com', '202', '202North', 'user');
    ensure('203@example.com', '203', '203North', 'user');
    ensure('204@example.com', '204', '204North', 'user');
    ensure('205@example.com', '205', '205North', 'user');
    ensure('206@example.com', '206', '206North', 'user');
    ensure('207@example.com', '207', '207North', 'user');
    ensure('trade@example.com', 'trade', 'TradeNorth', 'admin');
    setItem(DB_KEYS.USERS, users);
}

// Initialize DB with seed data
seedDefaultUsers();


// --- Public API ---

export const db = {
    // Users
    getUsers: (): User[] => getItem<User[]>(DB_KEYS.USERS, []),
    saveUsers: (users: User[]): void => setItem(DB_KEYS.USERS, users),

    // Current User
    getCurrentUser: (): CurrentUser | null => getItem<CurrentUser | null>(DB_KEYS.CURRENT_USER, null),
    setCurrentUser: (user: CurrentUser | null): void => setItem(DB_KEYS.CURRENT_USER, user),
    
    // Lancamentos
    getLancamentos: (): Lancamento[] => getItem<Lancamento[]>(DB_KEYS.LANCAMENTOS, []),
    saveLancamentos: (lancamentos: Lancamento[]): void => setItem(DB_KEYS.LANCAMENTOS, lancamentos),
    addLancamento: (lancamento: Lancamento): void => {
        const lancamentos = db.getLancamentos();
        // unshift to add to the beginning
        lancamentos.unshift(lancamento);
        db.saveLancamentos(lancamentos);
    },

    // Produtos (from constants, not localStorage)
    getProdutos: (): Produto[] => PRODUTOS,

    // Clientes
    getClientes: (): Cliente[] => getItem<Cliente[]>(DB_KEYS.CLIENTES, []),
    saveClientes: (clientes: Cliente[]): void => setItem(DB_KEYS.CLIENTES, clientes),

    // Import Logs
    getImportLogs: (): ImportLog[] => getItem<ImportLog[]>(DB_KEYS.IMPORT_LOGS, []),
    addImportLog: (log: Omit<ImportLog, 'id' | 'timestamp'>): void => {
        const logs = db.getImportLogs();
        const newLog: ImportLog = {
            ...log,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
        };
        logs.unshift(newLog); // Add to the beginning
        setItem(DB_KEYS.IMPORT_LOGS, logs.slice(0, 100)); // Keep only last 100 logs
    },

    // Unauthorized Access Log (placeholder)
    logUnauthorizedAccess: (username: string, view: string): void => {
        // In a real application, this would send a log to a backend service.
        // For this frontend-only app, we'll just log it to the console.
        console.warn(`[AUDIT] Tentativa de acesso não autorizado: Usuário='${username}', Tela='${view}', Data=${new Date().toISOString()}`);
    }
};
