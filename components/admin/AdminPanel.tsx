import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { db } from '../../services/db';
import { User, Lancamento, LancamentoStatus, UserRole, CurrentUser, Cliente, ImportLog } from '../../types';
import { DashboardIcon, UsersIcon, LancamentosIcon, ExportIcon, SettingsIcon, UploadIcon, DownloadIcon, EditIcon, TrashIcon, PlusIcon, XIcon, SearchIcon } from '../icons';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { StatCard } from '../ui/StatCard';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { FormGroup } from '../ui/FormGroup';

// Make TypeScript aware of the XLSX global variable from the CDN script
declare const XLSX: any;

type AdminView = 'dashboard' | 'lancamentos' | 'usuarios' | 'exportar' | 'configuracoes';

interface AdminPanelProps {
    currentUser: CurrentUser;
}

// --- Main Admin Panel Component ---
export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
    const [activeView, setActiveView] = useState<AdminView>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        // Log unauthorized access attempts
        if (currentUser.role !== 'super-admin' && (activeView === 'usuarios' || activeView === 'configuracoes')) {
             db.logUnauthorizedAccess(currentUser.username, activeView);
             setActiveView('dashboard'); // Redirect to a safe page
        }
    }, [activeView, currentUser]);

    const NavItem: React.FC<{ view: AdminView; icon: React.ReactNode; label: string }> = ({ view, icon, label }) => (
        <li>
            <a
                href="#"
                onClick={(e) => { e.preventDefault(); setActiveView(view); setSidebarOpen(false); }}
                className={`flex items-center p-4 text-foreground/80 hover:bg-accent transition-colors rounded-md ${activeView === view ? 'bg-primary text-primary-foreground font-semibold' : ''}`}
            >
                <span className="w-6 h-6 mr-4">{icon}</span>
                <span className="md:inline">{label}</span>
            </a>
        </li>
    );

    const renderContent = () => {
        switch (activeView) {
            case 'dashboard': return <DashboardView />;
            case 'lancamentos': return <LancamentosView />;
            case 'usuarios': 
                return currentUser.role === 'super-admin' ? <UsuariosView /> : <DashboardView />;
            case 'exportar': return <ExportarView />;
            case 'configuracoes': 
                return currentUser.role === 'super-admin' ? <ClientRegistrationView currentUser={currentUser} /> : <DashboardView />;
            default: return <DashboardView />;
        }
    };

    return (
        <div className="flex h-[calc(100vh-140px)] bg-background">
             <aside className={`absolute md:relative z-20 md:z-auto w-64 md:w-64 bg-card border-r border-border flex-shrink-0 transition-transform transform ${ sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <div className="p-5 text-xl font-semibold border-b border-border">Admin</div>
                <nav className="p-4">
                    <ul className="space-y-2">
                        <NavItem view="dashboard" icon={<DashboardIcon />} label="Dashboard" />
                        {currentUser.role === 'super-admin' && (
                           <NavItem view="usuarios" icon={<UsersIcon />} label="Usuários" />
                        )}
                        <NavItem view="lancamentos" icon={<LancamentosIcon />} label="Lançamentos" />
                        <NavItem view="exportar" icon={<ExportIcon />} label="Exportar Dados" />
                        {currentUser.role === 'super-admin' && (
                           <NavItem view="configuracoes" icon={<SettingsIcon />} label="Configurações" />
                        )}
                    </ul>
                </nav>
            </aside>
            <main className="flex-1 p-4 overflow-y-auto md:p-8">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 mb-4 bg-card rounded-md md:hidden text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                </button>
                {renderContent()}
            </main>
        </div>
    );
};

// --- Sub-Views ---

const inPeriod = (dateISO: string, range: string) => {
    const d = new Date(dateISO);
    const now = new Date();
    const start = new Date(now);
    if (range === 'Dia') start.setDate(now.getDate() - 1);
    else if (range === 'Semana') start.setDate(now.getDate() - 7);
    else if (range === 'Mês') start.setMonth(now.getMonth() - 1);
    else if (range === 'Ano') start.setFullYear(now.getFullYear() - 1);
    else return true;
    return d >= start && d <= now;
}

const Chart: React.FC<{data: Lancamento[], range: string}> = ({ data, range }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if(!ctx) return;

        ctx.clearRect(0,0, canvas.width, canvas.height);

        const buckets: {[key: string]: {cx: number, und: number}} = {};
        data.forEach(l => {
            const d = new Date(l.data);
            const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
            if (!buckets[key]) buckets[key] = { cx: 0, und: 0 };
            l.produtos.forEach(p => { buckets[key].cx += (p.qtd_cx||0); buckets[key].und += (p.qtd_und||0); });
        });
        
        const keys = Object.keys(buckets).sort();
        if (keys.length === 0) return;

        const maxY = Math.max(1, ...keys.map(k => Math.max(buckets[k].cx, buckets[k].und)));
        const W = canvas.width = canvas.clientWidth;
        const H = canvas.height;
        const pad = 30;

        ctx.strokeStyle = 'oklch(1 0 0 / 0.1)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad,10); ctx.lineTo(pad,H-pad); ctx.lineTo(W-10,H-pad); ctx.stroke();

        function toXY(i: number, val: number){ const x = pad + (i*(W-pad-20)/Math.max(1,keys.length-1)); const y = (H-pad) - (val/maxY)*(H-pad-20); return [x,y]; }
        
        function drawLine(color: string, dataKey: 'cx' | 'und'){ 
            ctx.strokeStyle = color; 
            ctx.lineWidth = 2; 
            ctx.beginPath(); 
            keys.forEach((k,i)=>{ 
                const v = buckets[k][dataKey]; 
                const [x,y] = toXY(i,v); 
                if (i===0) ctx.moveTo(x,y); 
                else ctx.lineTo(x,y); 
            }); 
            ctx.stroke(); 
        }

        drawLine('oklch(0.488 0.243 263)','cx'); // Chart 1 for CX
        drawLine('oklch(0.696 0.17 160)','und'); // Chart 2 for UND
    }, [data, range]);

    return (
        <Card>
            <div className='flex justify-between items-center mb-4'>
                <h3 className="text-lg font-semibold">Quantidades por período</h3>
                <div className='flex items-center space-x-2'>
                    <span className='flex items-center text-sm'><div className='w-3 h-3 bg-chart-1 mr-2 rounded-sm'></div>Qtd CX</span>
                    <span className='flex items-center text-sm'><div className='w-3 h-3 bg-chart-2 mr-2 rounded-sm'></div>Qtd Und</span>
                </div>
            </div>
            <canvas ref={canvasRef} height="200"></canvas>
        </Card>
    );
}

const DashboardView: React.FC = () => {
    const [period, setPeriod] = useState('Mês');
    const [rankingPeriod, setRankingPeriod] = useState('Mês');
    const allLancamentos = useMemo(() => db.getLancamentos(), []);
    const filteredLancamentos = useMemo(() => allLancamentos.filter(l => inPeriod(l.data, period)), [allLancamentos, period]);

    const totalLancamentos = filteredLancamentos.length;
    const totalPorTipo = useMemo(() => {
        const counts: { [key: string]: number } = {};
        filteredLancamentos.forEach(l => {
            l.produtos.forEach(p => {
                counts[p.tipo] = (counts[p.tipo] || 0) + 1;
            });
        });
        return counts;
    }, [filteredLancamentos]);

    const rankingData = useMemo(() => {
        const relevantLancamentos = allLancamentos.filter(l => inPeriod(l.data, rankingPeriod));
        const map: {[key: string]: number} = {};
        relevantLancamentos.forEach(l => l.produtos.forEach(p => { 
            if (p.tipo === 'Bonificação') { 
                map[l.codigo_cliente] = (map[l.codigo_cliente]||0) + (p.qtd_cx||0) + (p.qtd_und||0); 
            }
        }));
        return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,20);
    }, [allLancamentos, rankingPeriod]);

    const PeriodFilter: React.FC<{value: string, onChange: (val: string) => void}> = ({ value, onChange }) => (
        <div className="flex space-x-1 bg-secondary p-1 rounded-lg">
            {['Dia', 'Semana', 'Mês', 'Ano'].map(p => (
                <Button key={p} onClick={() => onChange(p)} variant={value === p ? 'primary' : 'ghost'} className='px-3 py-1 text-sm shadow-none'>
                    {p}
                </Button>
            ))}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className='flex justify-end'>
                <PeriodFilter value={period} onChange={setPeriod}/>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <StatCard title={`Total Lançamentos (${period})`}>{totalLancamentos}</StatCard>
                <StatCard title={`Produtos por Tipo (${period})`}>
                    <div className='text-sm grid grid-cols-2 gap-2 mt-2'>
                        {Object.entries(totalPorTipo).map(([tipo, count]) => (
                            <div key={tipo}><strong>{tipo}:</strong> {count}</div>
                        ))}
                        {Object.keys(totalPorTipo).length === 0 && <span className='col-span-2 text-muted-foreground'>N/A</span>}
                    </div>
                </StatCard>
            </div>
            
            <Chart data={filteredLancamentos} range={period} />

            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Ranking — 20 Clientes com Mais Bonificações</h3>
                    <PeriodFilter value={rankingPeriod} onChange={setRankingPeriod} />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-muted-foreground">
                        <thead className="text-xs uppercase bg-secondary text-secondary-foreground">
                            <tr>
                                <th scope="col" className="px-6 py-3">#</th>
                                <th scope="col" className="px-6 py-3">Código Cliente</th>
                                <th scope="col" className="px-6 py-3">Total Qtd</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rankingData.map(([codigo, total], i) => (
                                <tr key={codigo} className="border-b border-border">
                                    <td className="px-6 py-4">{i + 1}</td>
                                    <td className="px-6 py-4 font-medium text-foreground">{codigo}</td>
                                    <td className="px-6 py-4">{total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

// --- Helper for flattened rows in tables
const useFlattenedLancamentos = () => {
    const allLancamentos = useMemo(() => db.getLancamentos(), []);
    const flattened = useMemo(() => {
      const rows: { l: Lancamento, p: Lancamento['produtos'][0] }[] = [];
      allLancamentos.forEach(l => {
        l.produtos.forEach(p => {
          rows.push({ l, p });
        });
      });
      return rows;
    }, [allLancamentos]);
    return { allLancamentos, flattened };
};

const LancamentosView: React.FC = () => {
    const { flattened } = useFlattenedLancamentos();
    const [lancamentos, setLancamentos] = useState<Lancamento[]>(db.getLancamentos());
    const [filters, setFilters] = useState({ dataDe: '', dataAte: '', usuario: '', tipo: '', cod: '', status: '' });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const filteredRows = useMemo(() => {
        return flattened.filter(({l, p}) => {
            const d = new Date(l.data);
            if (filters.dataDe && d < new Date(filters.dataDe)) return false;
            if (filters.dataAte && d > new Date(filters.dataAte + 'T23:59:59')) return false;
            if (filters.usuario && !(`${l.username}`.toLowerCase().includes(filters.usuario.toLowerCase()) || `${l.userId}`.toLowerCase().includes(filters.usuario.toLowerCase()))) return false;
            if (filters.cod && l.codigo_cliente !== filters.cod) return false;
            if (filters.status && l.status !== filters.status) return false;
            if (filters.tipo && p.tipo !== filters.tipo) return false;
            return true;
        });
    }, [flattened, filters]);

    const paginatedRows = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredRows.slice(start, start + pageSize);
    }, [filteredRows, page, pageSize]);

    const totalPages = Math.ceil(filteredRows.length / pageSize);

    const handleStatusChange = (lancamentoId: string, newStatus: LancamentoStatus) => {
        const updated = lancamentos.map(l => l.id === lancamentoId ? { ...l, status: newStatus } : l);
        setLancamentos(updated);
        db.saveLancamentos(updated);
    };

    const handleExport = (format: 'csv' | 'xlsx') => {
        if (format === 'csv') {
            const headers = ['User','Código Cliente','Tipo','Descrição ou Justificativa','Data','Código Produto','Descrição Produto','Qtd CX','Qtd Und','Status'];
            const csvRows = [headers.join(';')];
            filteredRows.forEach(({l, p}) => {
                const row = [
                    `"${l.username || l.userId}"`,
                    `"${l.codigo_cliente}"`,
                    `"${p.tipo}"`,
                    `"${l.descricao || ''}"`,
                    `"${new Date(l.data).toLocaleString('pt-BR')}"`,
                    `"${p.codigo}"`,
                    `"${p.titulo}"`,
                    p.qtd_cx || 0,
                    p.qtd_und || 0,
                    `"${l.status || 'Pendente'}"`
                ];
                csvRows.push(row.join(';'));
            });
            const blob = new Blob(["\uFEFF" + csvRows.join('\n')], {type: 'text/csv;charset=utf-8;'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'lancamentos.csv'; a.click(); URL.revokeObjectURL(url);
        } else if (format === 'xlsx') {
            const seen = new Set();
            const lancamentosSheetData = filteredRows.map(({l}) => ({ id: l.id, data: new Date(l.data).toLocaleString('pt-BR'), user: l.username||l.userId, codigo_cliente: l.codigo_cliente, descricao: l.descricao||'', status: l.status||'Pendente' }))
                .filter(r => (seen.has(r.id) ? false : seen.add(r.id)));
            const produtosSheetData = filteredRows.map(({l, p}) => ({ lancamento_id: l.id, produto: `${p.codigo} - ${p.titulo}`, tipo: p.tipo, qtd_cx: p.qtd_cx||0, qtd_und: p.qtd_und||0, valor_cents: p.valor_cents }));

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lancamentosSheetData), 'Lancamentos');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(produtosSheetData), 'Produtos');
            XLSX.writeFile(wb, 'lancamentos.xlsx');
        }
    };

    const statusColorClass = (status: LancamentoStatus) => {
        if (status === 'Aprovado') return 'bg-success/80 text-success-foreground border-success';
        if (status === 'Cancelar') return 'bg-destructive/80 text-destructive-foreground border-destructive';
        return 'bg-secondary text-secondary-foreground';
    }

    return (
        <div className="space-y-6">
            <div className='flex items-center space-x-4'>
                <h2 className="text-2xl font-bold">Lançamentos</h2>
                <Button onClick={() => handleExport('csv')} variant="secondary">Exportar CSV</Button>
                <Button onClick={() => handleExport('xlsx')} variant="secondary">Exportar XLSX</Button>
            </div>
            <Card className="p-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                    <Input type="date" value={filters.dataDe} onChange={e => setFilters({...filters, dataDe: e.target.value})} />
                    <Input type="date" value={filters.dataAte} onChange={e => setFilters({...filters, dataAte: e.target.value})} />
                    <Input type="text" placeholder="Usuário" value={filters.usuario} onChange={e => setFilters({...filters, usuario: e.target.value})} />
                    <Input type="text" placeholder="Código Cliente" value={filters.cod} onChange={e => setFilters({...filters, cod: e.target.value})} />
                    <Select value={filters.tipo} onChange={e => setFilters({...filters, tipo: e.target.value})}><option value="">Tipo (Todos)</option><option>Venda</option><option>Bonificação</option><option>Troca</option><option>Reposição</option></Select>
                    <Select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}><option value="">Status (Todos)</option><option>Aprovado</option><option>Cancelar</option><option>Pendente</option></Select>
                </div>
            </Card>
            <Card className="p-0 overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-muted-foreground">
                        <thead className="text-xs uppercase bg-secondary text-secondary-foreground">
                            <tr>
                                <th className="px-4 py-3">Data</th>
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Cód. Cliente</th>
                                <th className="px-4 py-3">Produto</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3">Qtd CX</th>
                                <th className="px-4 py-3">Qtd Und</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedRows.map(({l, p}, index) => (
                                <tr key={`${l.id}-${index}`} className="border-b border-border">
                                    <td className="px-4 py-2">{new Date(l.data).toLocaleString('pt-BR')}</td>
                                    <td className="px-4 py-2 text-foreground">{l.username}</td>
                                    <td className="px-4 py-2">{l.codigo_cliente}</td>
                                    <td className="px-4 py-2 text-foreground">{p.titulo}</td>
                                    <td className="px-4 py-2">{p.tipo}</td>
                                    <td className="px-4 py-2">{p.qtd_cx}</td>
                                    <td className="px-4 py-2">{p.qtd_und}</td>
                                    <td className="px-4 py-2">
                                        <select value={l.status} onChange={(e) => handleStatusChange(l.id, e.target.value as LancamentoStatus)} className={`p-1 text-xs border rounded-md ${statusColorClass(l.status)}`}>
                                            <option value="Pendente">Pendente</option>
                                            <option value="Aprovado">Aprovado</option>
                                            <option value="Cancelar">Cancelar</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </Card>
            {/* Pagination */}
            <Card className="flex items-center justify-between p-4">
                <div>
                    <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
                    <Select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="p-1 ml-4 text-sm w-auto">
                        <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
                    </Select>
                    <span className='ml-4 text-sm text-muted-foreground'>Mostrando {paginatedRows.length} de {filteredRows.length} resultados</span>
                </div>
                <div className="space-x-2">
                    <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} variant="secondary" className="px-3 py-1 text-sm">Anterior</Button>
                    <Button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} variant="secondary" className="px-3 py-1 text-sm">Próximo</Button>
                </div>
            </Card>
        </div>
    );
};

const UsuariosView: React.FC = () => {
    const [users, setUsers] = useState(() => db.getUsers());
    const [newUsername, setNewUsername] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('user');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // State for editing and deleting
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editingUserRole, setEditingUserRole] = useState<UserRole>('user');
    const [deletingUser, setDeletingUser] = useState<User | null>(null);

    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!newUsername || !newEmail || !newPassword) {
            setError('Por favor, preencha todos os campos.');
            return;
        }
        const currentUsers = db.getUsers();
        if (currentUsers.some(u => u.username.toLowerCase() === newUsername.toLowerCase())) {
            setError('Este nome de usuário já existe.');
            return;
        }
        if (currentUsers.some(u => u.email.toLowerCase() === newEmail.toLowerCase())) {
            setError('Este e-mail já está cadastrado.');
            return;
        }

        const newUser: User = {
            id: crypto.randomUUID(),
            username: newUsername,
            email: newEmail,
            password: newPassword, // In a real app, this should be hashed
            role: newRole,
        };

        const updatedUsers = [...currentUsers, newUser];
        db.saveUsers(updatedUsers);

        setUsers(updatedUsers);
        setSuccess(`Usuário "${newUsername}" criado com sucesso!`);

        setNewUsername('');
        setNewEmail('');
        setNewPassword('');
        setNewRole('user');

        setTimeout(() => setSuccess(''), 4000);
    };

    const handleEditClick = (user: User) => {
        setEditingUserId(user.id);
        setEditingUserRole(user.role);
    };

    const handleCancelEdit = () => {
        setEditingUserId(null);
    };

    const handleSaveEdit = (userId: string) => {
        const updatedUsers = users.map(u => u.id === userId ? { ...u, role: editingUserRole } : u);
        db.saveUsers(updatedUsers);
        setUsers(updatedUsers);
        setEditingUserId(null);
    };

    const handleDeleteClick = (user: User) => {
        setDeletingUser(user);
    };

    const handleConfirmDelete = () => {
        if (!deletingUser) return;
        const updatedUsers = users.filter(u => u.id !== deletingUser.id);
        db.saveUsers(updatedUsers);
        setUsers(updatedUsers);
        setDeletingUser(null);
    };

    return (
        <div className="space-y-6">
            {deletingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <Card className="w-full max-w-md">
                        <h3 className="text-xl font-bold">Confirmar Exclusão</h3>
                        <p className="my-4 text-muted-foreground">
                            Tem certeza que deseja excluir o usuário <strong className="text-foreground">{deletingUser.username}</strong>? Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex justify-end gap-4 mt-6">
                            <Button variant="secondary" onClick={() => setDeletingUser(null)}>Cancelar</Button>
                            <Button variant="danger" onClick={handleConfirmDelete}>Excluir</Button>
                        </div>
                    </Card>
                </div>
            )}
            <Card>
                <h3 className="text-xl font-bold mb-4">Criar Novo Usuário</h3>
                {error && <div className="p-3 mb-4 text-sm text-destructive-foreground bg-destructive/20 border border-destructive/30 rounded-lg">{error}</div>}
                {success && <div className="p-3 mb-4 text-sm text-success-foreground bg-success/20 border border-success/30 rounded-lg">{success}</div>}
                <form onSubmit={handleCreateUser}>
                    <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2 lg:grid-cols-4">
                        <FormGroup label="Usuário" htmlFor="new-username">
                            <Input id="new-username" value={newUsername} onChange={e => setNewUsername(e.target.value)} required />
                        </FormGroup>
                        <FormGroup label="E-mail" htmlFor="new-email">
                            <Input id="new-email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                        </FormGroup>
                        <FormGroup label="Senha" htmlFor="new-password">
                            <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                        </FormGroup>
                        <FormGroup label="Role" htmlFor="new-role">
                            <Select id="new-role" value={newRole} onChange={e => setNewRole(e.target.value as UserRole)}>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                                <option value="super-admin">Super Admin</option>
                            </Select>
                        </FormGroup>
                    </div>
                    <Button type="submit" variant="success">Criar Usuário</Button>
                </form>
            </Card>

            <Card className="overflow-hidden p-0">
                <h2 className="p-6 text-2xl font-bold border-b border-border">Usuários Cadastrados</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-muted-foreground">
                        <thead className="text-xs uppercase bg-secondary text-secondary-foreground">
                            <tr>
                                <th className="px-6 py-3">ID</th>
                                <th className="px-6 py-3">Usuário</th>
                                <th className="px-6 py-3">E-mail</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u: User) => (
                                <tr key={u.id} className="border-b border-border">
                                    <td className="px-6 py-4 whitespace-nowrap">{u.id.substring(0, 8)}...</td>
                                    <td className="px-6 py-4 text-foreground">{u.username}</td>
                                    <td className="px-6 py-4">{u.email}</td>
                                    <td className="px-6 py-4">
                                        {editingUserId === u.id ? (
                                            <Select value={editingUserRole} onChange={(e) => setEditingUserRole(e.target.value as UserRole)} className="p-1 text-sm">
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                                <option value="super-admin">Super Admin</option>
                                            </Select>
                                        ) : (
                                            u.role
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {u.username !== 'admin' ? (
                                            editingUserId === u.id ? (
                                                <div className="flex justify-end gap-2">
                                                    <Button onClick={() => handleSaveEdit(u.id)} variant="success" className="px-3 py-1 text-xs">Salvar</Button>
                                                    <Button onClick={handleCancelEdit} variant="secondary" className="px-3 py-1 text-xs">Cancelar</Button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-2">
                                                    <Button onClick={() => handleEditClick(u)} variant="secondary" className="px-3 py-1 text-xs">Editar</Button>
                                                    <Button onClick={() => handleDeleteClick(u)} variant="danger" className="px-3 py-1 text-xs">Deletar</Button>
                                                </div>
                                            )
                                        ) : (
                                            <span className="text-xs italic text-muted-foreground/70">Não pode ser alterado</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
const ExportarView: React.FC = () => { 
    const handleExportAll = (format: 'csv' | 'xlsx') => {
        const rows: {l: Lancamento, p: Lancamento['produtos'][0]}[] = [];
        db.getLancamentos().forEach(l => l.produtos.forEach(p => rows.push({l, p})));
        if(format === 'csv') {
            const headers = ['User','Código Cliente','Tipo','Descrição ou Justificativa','Data','Código Produto','Descrição Produto','Qtd CX','Qtd Und','Status'];
            const csvRows = [headers.join(';')];
            rows.forEach(({l, p}) => {
                const row = [`"${l.username||l.userId}"`,`"${l.codigo_cliente}"`,`"${p.tipo}"`,`"${l.descricao||''}"`,`"${new Date(l.data).toLocaleString('pt-BR')}"`,`"${p.codigo}"`,`"${p.titulo}"`,p.qtd_cx||0,p.qtd_und||0,`"${l.status||'Pendente'}"`];
                csvRows.push(row.join(';'));
            });
            const blob = new Blob(["\uFEFF" + csvRows.join('\n')], {type: 'text/csv;charset=utf-8;'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'lancamentos_todos.csv'; a.click(); URL.revokeObjectURL(url);
        } else if (format === 'xlsx') {
            const seen = new Set();
            const lancamentosSheetData = rows.map(({l}) => ({ id: l.id, data: new Date(l.data).toLocaleString('pt-BR'), user: l.username||l.userId, codigo_cliente: l.codigo_cliente, descricao: l.descricao||'', status: l.status||'Pendente' })).filter(r => (seen.has(r.id) ? false : seen.add(r.id)));
            const produtosSheetData = rows.map(({l, p}) => ({ lancamento_id: l.id, produto: `${p.codigo} - ${p.titulo}`, tipo: p.tipo, qtd_cx: p.qtd_cx||0, qtd_und: p.qtd_und||0, valor_cents: p.valor_cents }));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lancamentosSheetData), 'Lancamentos');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(produtosSheetData), 'Produtos');
            XLSX.writeFile(wb, 'lancamentos_todos.xlsx');
        }
    }
    
    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4">Exportar Todos os Dados</h2>
            <div className='flex space-x-4'>
                <Button onClick={() => handleExportAll('csv')} variant="secondary">Exportar CSV (todos)</Button>
                <Button onClick={() => handleExportAll('xlsx')} variant="secondary">Exportar XLSX (todos)</Button>
            </div>
        </Card>
    );
};

// --- NEW CLIENT REGISTRATION VIEW ---
const CLIENT_HEADERS: (keyof Cliente)[] = ['Codigo-BW', 'Codigo', 'CNPJ/CPF', 'Nome Fantasia', 'Razão Social', 'Vend', 'Superv', 'Dia Visita', 'Segmentação Potencial', 'Canal', 'Canais', 'Cidade', 'Tel 1'];

const ClientRegistrationView: React.FC<{currentUser: CurrentUser}> = ({ currentUser }) => {
    const [clientes, setClientes] = useState<Cliente[]>(() => db.getClientes());
    const [logs, setLogs] = useState<ImportLog[]>(() => db.getImportLogs());
    const [isImporting, setIsImporting] = useState(false);
    const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Cliente | null>(null);

    const filteredClientes = useMemo(() => {
        if (!searchTerm) return clientes;
        const lowercasedTerm = searchTerm.toLowerCase();
        return clientes.filter(c => 
            Object.values(c).some(val => 
                String(val).toLowerCase().includes(lowercasedTerm)
            )
        );
    }, [clientes, searchTerm]);

    const paginatedClientes = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredClientes.slice(start, start + pageSize);
    }, [filteredClientes, page, pageSize]);

    const totalPages = Math.ceil(filteredClientes.length / pageSize);
    
    const handleDownloadTemplate = () => {
        const headerString = CLIENT_HEADERS.join(';');
        const blob = new Blob(["\uFEFF" + headerString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "template_clientes.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        if (!file.name.endsWith('.csv')) {
            setImportFeedback({ type: 'error', message: 'Formato de arquivo inválido. Apenas .csv é permitido.' });
            db.addImportLog({ user: currentUser.username, status: 'Falha', details: 'Tentativa de upload de arquivo não-csv.' });
            setLogs(db.getImportLogs());
            return;
        }

        setIsImporting(true);
        setImportFeedback(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvText = e.target?.result as string;
                const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');

                if (lines.length < 2) {
                    throw new Error("O arquivo CSV está vazio ou contém apenas o cabeçalho.");
                }

                const headerLine = lines[0];
                const detectDelimiter = (line: string): ';' | ',' => {
                    const commaCount = (line.match(/,/g) || []).length;
                    const semicolonCount = (line.match(/;/g) || []).length;
                    if (semicolonCount >= commaCount && semicolonCount > 0) {
                        return ';';
                    }
                    if (commaCount > semicolonCount) {
                        return ',';
                    }
                    return ';'; // Default to new standard
                };
                const delimiter = detectDelimiter(headerLine);

                const fileHeaders = headerLine.split(delimiter).map(h => h.trim());
                const missingHeaders = CLIENT_HEADERS.filter(h => !fileHeaders.includes(h));
                if (missingHeaders.length > 0 || CLIENT_HEADERS[0] !== fileHeaders[0]) {
                     throw new Error(`Estrutura do arquivo inválida. Cabeçalhos faltando ou fora de ordem. Comece com '${CLIENT_HEADERS[0]}'.`);
                }

                const currentClientes = new Map(db.getClientes().map(c => [c['Codigo-BW'], c]));
                let updatedCount = 0;
                let newCount = 0;

                for (let i = 1; i < lines.length; i++) {
                     if (lines[i].trim() === '') continue; // Skip empty rows
                     if (i >= 5001) { // 5000 rows + 1 header
                        throw new Error('O arquivo excede o limite de 5.000 linhas.');
                     }

                    const values = lines[i].split(delimiter).map(v => v.trim());
                    const rowData: any = {};
                    fileHeaders.forEach((header, index) => {
                        rowData[header] = values[index] || "";
                    });

                    const codigoBw = String(rowData['Codigo-BW'] || '').trim();

                    if (!codigoBw) {
                        throw new Error(`Erro na linha ${i + 1}: O campo obrigatório 'Codigo-BW' está faltando.`);
                    }

                    const clienteData: Cliente = { 'Codigo-BW': codigoBw };
                     CLIENT_HEADERS.forEach(h => {
                       if (h !== 'Codigo-BW' && rowData[h] !== undefined) {
                           (clienteData as any)[h] = String(rowData[h]);
                       }
                    });

                    if (currentClientes.has(codigoBw)) {
                        updatedCount++;
                    } else {
                        newCount++;
                    }
                    currentClientes.set(codigoBw, clienteData);
                }

                const updatedClientesList = Array.from(currentClientes.values());
                db.saveClientes(updatedClientesList);
                setClientes(updatedClientesList);
                
                const successMsg = `Importação concluída. ${newCount} clientes adicionados, ${updatedCount} atualizados.`;
                setImportFeedback({ type: 'success', message: successMsg });
                db.addImportLog({ user: currentUser.username, status: 'Sucesso', details: successMsg });
                setLogs(db.getImportLogs());

            } catch (error: any) {
                const errorMsg = `Falha na importação: ${error.message}`;
                setImportFeedback({ type: 'error', message: errorMsg });
                db.addImportLog({ user: currentUser.username, status: 'Falha', details: errorMsg });
                setLogs(db.getImportLogs());
            } finally {
                setIsImporting(false);
                event.target.value = ''; // Reset file input
            }
        };
        reader.readAsText(file, 'UTF-8');
    };

    const openModal = (client: Cliente | null) => {
        setEditingClient(client);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingClient(null);
    };

    const handleSaveClient = (clientData: Cliente) => {
        let updatedClientes;
        if (editingClient) { // Editing existing client
            updatedClientes = clientes.map(c => c['Codigo-BW'] === editingClient['Codigo-BW'] ? clientData : c);
        } else { // Creating new client
            if (clientes.some(c => c['Codigo-BW'] === clientData['Codigo-BW'])) {
                // simple feedback for now
                alert('Erro: Codigo-BW já existe.');
                return;
            }
            updatedClientes = [...clientes, clientData];
        }
        db.saveClientes(updatedClientes);
        setClientes(updatedClientes);
        closeModal();
    };

    const handleDeleteClient = (codigoBw: string) => {
        if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
            const updatedClientes = clientes.filter(c => c['Codigo-BW'] !== codigoBw);
            db.saveClientes(updatedClientes);
            setClientes(updatedClientes);
        }
    };

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold">Gerenciamento de Clientes</h2>
            
            {/* --- Import/Export Section --- */}
            <Card>
                <h3 className="text-xl font-semibold mb-4">Importação de Clientes via CSV</h3>
                <div className="flex flex-col md:flex-row gap-4 items-start">
                    <Button onClick={handleDownloadTemplate} variant="secondary" className="flex items-center gap-2">
                        <DownloadIcon className="w-5 h-5" /> Baixar Template
                    </Button>
                    <label className="flex items-center gap-2 px-5 py-2.5 font-semibold rounded-md shadow-md hover:shadow-lg transition-all bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
                        <UploadIcon className="w-5 h-5" />
                        <span>{isImporting ? 'Importando...' : 'Importar Arquivo'}</span>
                        <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isImporting} />
                    </label>
                </div>
                 {importFeedback && (
                    <div className={`mt-4 p-3 rounded-md text-sm ${importFeedback.type === 'success' ? 'bg-success/20 text-success-foreground border border-success/30' : 'bg-destructive/20 text-destructive-foreground border border-destructive/30'}`}>
                        {importFeedback.message}
                    </div>
                )}
            </Card>

            {/* --- Client List Section --- */}
            <Card>
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <h3 className="text-xl font-semibold">Lista de Clientes ({filteredClientes.length})</h3>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <Input 
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                className="pr-10"
                            />
                            <SearchIcon className="absolute w-5 h-5 text-muted-foreground top-3.5 right-3" />
                        </div>
                        <Button onClick={() => openModal(null)} className="flex items-center gap-2 flex-shrink-0">
                           <PlusIcon className="w-5 h-5"/> Adicionar
                        </Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-secondary text-secondary-foreground">
                            <tr>
                                {CLIENT_HEADERS.slice(0, 5).map(h => <th key={h} className="px-4 py-3">{h}</th>)}
                                <th className="px-4 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                            {paginatedClientes.map(cliente => (
                                <tr key={cliente['Codigo-BW']} className="border-b border-border hover:bg-secondary/50">
                                    {CLIENT_HEADERS.slice(0, 5).map(h => <td key={h} className="px-4 py-2 whitespace-nowrap">{cliente[h]}</td>)}
                                    <td className="px-4 py-2 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <Button onClick={() => openModal(cliente)} variant="ghost" className="p-2 h-auto"><EditIcon className="w-4 h-4" /></Button>
                                            <Button onClick={() => handleDeleteClient(cliente['Codigo-BW'])} variant="ghost" className="p-2 h-auto text-destructive"><TrashIcon className="w-4 h-4" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="flex items-center justify-between p-4">
                    <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
                    <div className="space-x-2">
                        <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} variant="secondary" className="px-3 py-1 text-sm">Anterior</Button>
                        <Button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} variant="secondary" className="px-3 py-1 text-sm">Próximo</Button>
                    </div>
                </div>
            </Card>

            {/* --- Audit Log Section --- */}
            <Card>
                <h3 className="text-xl font-semibold mb-4">Log de Importações</h3>
                <div className="overflow-y-auto max-h-64">
                    <ul className="space-y-2">
                        {logs.map(log => (
                            <li key={log.id} className={`p-3 rounded-md text-sm ${log.status === 'Sucesso' ? 'bg-secondary' : 'bg-destructive/20'}`}>
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold">{log.user} @ {new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                                    <span className={`font-bold ${log.status === 'Sucesso' ? 'text-success' : 'text-destructive'}`}>{log.status}</span>
                                </div>
                                <p className="text-muted-foreground mt-1">{log.details}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </Card>

            {isModalOpen && <ClientFormModal client={editingClient} onSave={handleSaveClient} onClose={closeModal} />}
        </div>
    );
};

const ClientFormModal: React.FC<{client: Cliente | null, onSave: (client: Cliente) => void, onClose: () => void}> = ({ client, onSave, onClose }) => {
    // FIX: Correctly type the initial state by casting through `unknown`.
    const [formData, setFormData] = useState<Cliente>(() => client || Object.fromEntries(CLIENT_HEADERS.map(h => [h, ''])) as unknown as Cliente);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData['Codigo-BW']) {
            setError('O campo "Codigo-BW" é obrigatório.');
            return;
        }
        onSave(formData);
    };

    return (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <Card className="w-full max-w-3xl relative max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
                    <h3 className="text-xl font-bold">{client ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                    <Button onClick={onClose} variant="ghost" className="p-2 h-auto"><XIcon className="w-5 h-5" /></Button>
                </div>
                <form onSubmit={handleSubmit} className="overflow-y-auto flex-grow">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {CLIENT_HEADERS.map(header => (
                            <FormGroup key={header} label={header} htmlFor={header}>
                                <Input
                                    id={header}
                                    name={header}
                                    value={(formData as any)[header] || ''}
                                    onChange={handleChange}
                                    disabled={header === 'Codigo-BW' && !!client}
                                />
                            </FormGroup>
                        ))}
                    </div>
                     {error && <p className="text-destructive mt-4">{error}</p>}
                </form>
                <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-border">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button variant="success" onClick={handleSubmit}>Salvar</Button>
                </div>
            </Card>
        </div>
    );
};