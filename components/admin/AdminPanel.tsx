import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { db } from '../../services/db';
import { User, Lancamento, LancamentoStatus, UserRole, CurrentUser, Cliente, ImportLog, LancamentoProduto } from '../../types';
import { DashboardIcon, UsersIcon, LancamentosIcon, ExportIcon, SettingsIcon, UploadIcon, DownloadIcon, EditIcon, TrashIcon, PlusIcon, XIcon, SearchIcon } from '../icons';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { StatCard } from '../ui/StatCard';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { FormGroup } from '../ui/FormGroup';

// Make TypeScript aware of the XLSX global variable from the CDN script
declare const XLSX: any;

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
                <h3 className="text-lg font-semibold">Quantidades</h3>
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
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
                             {rankingData.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-center">Nenhum dado de bonificação no período.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

const LancamentosView: React.FC = () => {
    const [lancamentos, setLancamentos] = useState<Lancamento[]>(() => db.getLancamentos());
    const [filters, setFilters] = useState({ dataDe: '', dataAte: '', usuario: '', tipo: '', cod: '', status: '' });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const flattened = useMemo(() => {
        const rows: { l: Lancamento, p: LancamentoProduto, pIndex: number }[] = [];
        lancamentos.forEach(l => {
            l.produtos.forEach((p, pIndex) => {
                rows.push({ l, p, pIndex });
            });
        });
        return rows;
    }, [lancamentos]);

    const filteredRows = useMemo(() => {
        return flattened.filter(({l, p}) => {
            const d = new Date(l.data);
            if (filters.dataDe && d < new Date(filters.dataDe)) return false;
            if (filters.dataAte && d > new Date(filters.dataAte + 'T23:59:59')) return false;
            if (filters.usuario && !(`${l.username}`.toLowerCase().includes(filters.usuario.toLowerCase()) || `${l.userId}`.toLowerCase().includes(filters.usuario.toLowerCase()))) return false;
            if (filters.cod && l.codigo_cliente !== filters.cod) return false;
            if (filters.status && p.status !== filters.status) return false;
            if (filters.tipo && p.tipo !== filters.tipo) return false;
            return true;
        });
    }, [flattened, filters]);

    const paginatedRows = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredRows.slice(start, start + pageSize);
    }, [filteredRows, page, pageSize]);

    const totalPages = Math.ceil(filteredRows.length / pageSize);

    const handleStatusChange = (lancamentoId: string, productIndex: number, newStatus: LancamentoStatus) => {
        const updated = lancamentos.map(l => {
            if (l.id === lancamentoId) {
                const updatedProdutos = l.produtos.map((p, index) => {
                    if (index === productIndex) {
                        return { ...p, status: newStatus };
                    }
                    return p;
                });
                return { ...l, produtos: updatedProdutos };
            }
            return l;
        });
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
                    `"${p.justificativa || ''}"`,
                    `"${new Date(l.data).toLocaleString('pt-BR')}"`,
                    `"${p.codigo}"`,
                    `"${p.titulo}"`,
                    p.qtd_cx || 0,
                    p.qtd_und || 0,
                    `"${p.status || 'Pendente'}"`
                ];
                csvRows.push(row.join(';'));
            });
            const blob = new Blob(["\uFEFF" + csvRows.join('\n')], {type: 'text/csv;charset=utf-8;'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'lancamentos.csv'; a.click(); URL.revokeObjectURL(url);
        } else if (format === 'xlsx') {
            const seen = new Set();
            const lancamentosSheetData = filteredRows.map(({l}) => ({ id: l.id, data: new Date(l.data).toLocaleString('pt-BR'), user: l.username||l.userId, codigo_cliente: l.codigo_cliente }))
                .filter(r => (seen.has(r.id) ? false : seen.add(r.id)));
            const produtosSheetData = filteredRows.map(({l, p}) => ({ lancamento_id: l.id, produto: `${p.codigo} - ${p.titulo}`, tipo: p.tipo, qtd_cx: p.qtd_cx||0, qtd_und: p.qtd_und||0, valor_cents: p.valor_cents, status: p.status || 'Pendente', justificativa: p.justificativa || '' }));

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
            <div className='flex flex-wrap items-center gap-4'>
                <h2 className="text-2xl font-bold">Lançamentos</h2>
                <Button onClick={() => handleExport('csv')} variant="secondary">Exportar CSV</Button>
                <Button onClick={() => handleExport('xlsx')} variant="secondary">Exportar XLSX</Button>
            </div>
            <Card className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                                <th className="px-4 py-3">Justificativa</th>
                                <th className="px-4 py-3">Qtd CX</th>
                                <th className="px-4 py-3">Qtd Und</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedRows.map(({l, p, pIndex}) => (
                                <tr key={`${l.id}-${pIndex}`} className="border-b border-border">
                                    <td className="px-4 py-2">{new Date(l.data).toLocaleString('pt-BR')}</td>
                                    <td className="px-4 py-2 text-foreground">{l.username}</td>
                                    <td className="px-4 py-2">{l.codigo_cliente}</td>
                                    <td className="px-4 py-2 text-foreground">{p.titulo}</td>
                                    <td className="px-4 py-2">{p.tipo}</td>
                                    <td className="px-4 py-2 max-w-[200px] truncate" title={p.justificativa}>{p.justificativa}</td>
                                    <td className="px-4 py-2">{p.qtd_cx}</td>
                                    <td className="px-4 py-2">{p.qtd_und}</td>
                                    <td className="px-4 py-2">
                                        <select value={p.status} onChange={(e) => handleStatusChange(l.id, pIndex, e.target.value as LancamentoStatus)} className={`p-1 text-xs border rounded-md ${statusColorClass(p.status)}`}>
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
            <Card className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
                    <Select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="p-1 text-sm w-auto">
                        <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
                    </Select>
                    <span className='hidden sm:inline ml-4 text-sm text-muted-foreground'>Mostrando {paginatedRows.length} de {filteredRows.length}</span>
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
                    <Card className="w-full max-w-md m-4">
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
                <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <FormGroup label="Usuário" htmlFor="new-username">
                            <Input id="new-username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required />
                        </FormGroup>
                        <FormGroup label="E-mail" htmlFor="new-email">
                             <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
                        </FormGroup>
                        <FormGroup label="Senha" htmlFor="new-password">
                            <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                        </FormGroup>
                        <FormGroup label="Nível de Acesso" htmlFor="new-role">
                             <Select id="new-role" value={newRole} onChange={e => setNewRole(e.target.value as UserRole)}>
                                <option value="user">Usuário</option>
                                <option value="admin">Admin</option>
                                <option value="super-admin">Super Admin</option>
                            </Select>
                        </FormGroup>
                    </div>
                    <Button type="submit" variant="success">
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Adicionar Usuário
                    </Button>
                </form>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-muted-foreground">
                        <thead className="text-xs uppercase bg-secondary text-secondary-foreground">
                            <tr>
                                <th className="px-6 py-3">Usuário</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Nível</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-b border-border">
                                    <td className="px-6 py-4 font-medium text-foreground">{user.username}</td>
                                    <td className="px-6 py-4">{user.email}</td>
                                    <td className="px-6 py-4">
                                        {editingUserId === user.id ? (
                                            <Select value={editingUserRole} onChange={e => setEditingUserRole(e.target.value as UserRole)}>
                                                <option value="user">Usuário</option>
                                                <option value="admin">Admin</option>
                                                <option value="super-admin">Super Admin</option>
                                            </Select>
                                        ) : (
                                            user.role
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                         {editingUserId === user.id ? (
                                            <div className="flex items-center justify-end gap-3">
                                                <Button variant="success" className="h-auto text-sm px-4 py-2" onClick={() => handleSaveEdit(user.id)}>Salvar</Button>
                                                <Button variant="ghost" className="p-0 h-9 w-9 flex items-center justify-center rounded-full" onClick={handleCancelEdit}>
                                                    <XIcon className="w-5 h-5"/>
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-3">
                                                <Button variant="ghost" className="p-0 h-9 w-9 flex items-center justify-center rounded-full" onClick={() => handleEditClick(user)}>
                                                    <EditIcon className="w-5 h-5"/>
                                                </Button>
                                                {user.role !== 'super-admin' && ( // Prevent deleting super-admin
                                                    <Button variant="ghost" className="p-0 h-9 w-9 flex items-center justify-center rounded-full text-destructive" onClick={() => handleDeleteClick(user)}>
                                                        <TrashIcon className="w-5 h-5"/>
                                                    </Button>
                                                )}
                                            </div>
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
    const [status, setStatus] = useState('');
    const lancamentos = db.getLancamentos();

    const handleExport = (format: 'csv' | 'xlsx') => {
        setStatus(`Exportando para ${format.toUpperCase()}...`);
        try {
            if (format === 'csv') {
                const headers = ['Data', 'User', 'Código Cliente', 'Código Produto', 'Título Produto', 'Tipo', 'Qtd CX', 'Qtd Und', 'Valor Cents', 'Status', 'Justificativa'];
                const csvRows = [headers.join(';')];
                lancamentos.forEach(l => {
                    l.produtos.forEach(p => {
                        const row = [
                            `"${new Date(l.data).toLocaleString('pt-BR')}"`,
                            `"${l.username}"`,
                            `"${l.codigo_cliente}"`,
                            `"${p.codigo}"`,
                            `"${p.titulo}"`,
                            `"${p.tipo}"`,
                            p.qtd_cx,
                            p.qtd_und,
                            p.valor_cents,
                            `"${p.status}"`,
                            `"${p.justificativa.replace(/"/g, '""')}"`
                        ];
                        csvRows.push(row.join(';'));
                    });
                });
                const blob = new Blob(["\uFEFF" + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'exportacao_completa.csv'; a.click(); URL.revokeObjectURL(url);
            } else {
                const data = lancamentos.flatMap(l => 
                    l.produtos.map(p => ({
                        Data: new Date(l.data).toLocaleString('pt-BR'),
                        User: l.username,
                        'Código Cliente': l.codigo_cliente,
                        'Código Produto': p.codigo,
                        'Título Produto': p.titulo,
                        Tipo: p.tipo,
                        'Qtd CX': p.qtd_cx,
                        'Qtd Und': p.qtd_und,
                        'Valor Cents': p.valor_cents,
                        Status: p.status,
                        Justificativa: p.justificativa
                    }))
                );
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Lançamentos');
                XLSX.writeFile(wb, 'exportacao_completa.xlsx');
            }
            setStatus('Exportação concluída com sucesso!');
        } catch (error) {
            console.error("Export failed:", error);
            setStatus('Ocorreu um erro durante a exportação.');
        } finally {
            setTimeout(() => setStatus(''), 5000);
        }
    };

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4">Exportar Todos os Dados</h2>
            <p className="mb-6 text-muted-foreground">
                Faça o download de todos os lançamentos registrados no sistema. Escolha o formato desejado.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4">
                <Button onClick={() => handleExport('csv')} variant='secondary'>
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Exportar para CSV
                </Button>
                <Button onClick={() => handleExport('xlsx')} variant='secondary'>
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Exportar para XLSX
                </Button>
            </div>
            {status && <p className="mt-4 text-sm text-foreground">{status}</p>}
        </Card>
    );
};

const ClientRegistrationView: React.FC<{ currentUser: CurrentUser }> = ({ currentUser }) => {
    const [clientes, setClientes] = useState<Cliente[]>(() => db.getClientes());
    const [importLogs, setImportLogs] = useState<ImportLog[]>(() => db.getImportLogs());
    const [status, setStatus] = useState('');
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importResult, setImportResult] = useState<{
        added: number;
        updated: number;
        errors: string[];
        processed: number;
    } | null>(null);

    const handleDownloadTemplate = () => {
        const templateData = [{
            'Codigo-BW': '1234-5678',
            'Codigo': '12345',
            'CNPJ/CPF': '00.000.000/0001-00',
            'Nome Fantasia': 'NOME FANTASIA EXEMPLO',
            'Razão Social': 'RAZAO SOCIAL EXEMPLO LTDA',
            'Vend': '101',
            'Superv': 'SUP100',
            'Dia Visita': 'SEGUNDA',
            'Segmentação Potencial': 'A',
            'Canal': 'AS',
            'Canais': 'AUTOSSERVIÇO',
            'Cidade': 'SAO PAULO',
            'Tel 1': '(11) 99999-9999',
        }];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
        XLSX.writeFile(wb, 'template_clientes.xlsx');
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setImportResult(null); // Reset summary on new file selection
        if (file) {
            setFileName(file.name);
            setStatus(`Arquivo "${file.name}" selecionado. Pronto para importar.`);
        } else {
            setFileName('');
            setStatus('');
        }
    };

    const handleImport = () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
            setStatus('Por favor, selecione um arquivo XLSX.');
            setImportResult(null);
            return;
        }

        setStatus('Processando arquivo...');
        setImportResult(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            const processingErrors: string[] = [];
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" }); // defval to handle empty cells

                if (json.length === 0) {
                    throw new Error('A planilha está vazia.');
                }

                // --- Validation ---
                const requiredField = 'Codigo-BW';
                if (!json[0] || !json[0].hasOwnProperty(requiredField)) {
                    throw new Error(`A planilha não contém a coluna obrigatória: "${requiredField}".`);
                }
                
                const seenCodes = new Set<string>();
                json.forEach((row, index) => {
                    const code = row[requiredField]?.toString().trim();
                    if (!code) {
                        processingErrors.push(`Linha ${index + 2}: 'Codigo-BW' está vazio.`);
                    } else if (seenCodes.has(code)) {
                        processingErrors.push(`Linha ${index + 2}: 'Codigo-BW' duplicado na planilha: ${code}`);
                    } else {
                        seenCodes.add(code);
                    }
                });

                if (processingErrors.length > 0) {
                    setImportResult({ added: 0, updated: 0, errors: processingErrors, processed: json.length });
                    setStatus('Foram encontrados erros na planilha. Corrija-os e tente novamente.');
                    const logDetails = `Falha na validação do arquivo ${fileName}. Erros: ${processingErrors.slice(0, 3).join(', ')}...`;
                    db.addImportLog({ user: currentUser.username, status: 'Falha', details: logDetails });
                    setImportLogs(db.getImportLogs());
                    return;
                }

                // --- Processing (Update/Insert) ---
                const existingClientesMap = new Map<string, Cliente>(db.getClientes().map(c => [c['Codigo-BW'], c]));
                let addedCount = 0;
                let updatedCount = 0;
                const newClientesFromSheet = json.map(row => row as Cliente);

                newClientesFromSheet.forEach(newCliente => {
                    const code = newCliente['Codigo-BW'].toString().trim();
                    if (existingClientesMap.has(code)) {
                        const existingClient = existingClientesMap.get(code)!;
                        existingClientesMap.set(code, { ...existingClient, ...newCliente });
                        updatedCount++;
                    } else {
                        existingClientesMap.set(code, newCliente);
                        addedCount++;
                    }
                });

                const finalClientes = Array.from(existingClientesMap.values());
                db.saveClientes(finalClientes);
                setClientes(finalClientes);

                const logDetail = `Importação concluída: ${addedCount} adicionados, ${updatedCount} atualizados.`;
                setImportResult({ added: addedCount, updated: updatedCount, errors: [], processed: json.length });
                setStatus(logDetail);
                db.addImportLog({ user: currentUser.username, status: 'Sucesso', details: `${logDetail} a partir de ${fileName}.` });
                setImportLogs(db.getImportLogs());

            } catch (error: any) {
                console.error("Import failed:", error);
                const errorDetail = `Falha na importação: ${error.message}`;
                db.addImportLog({ user: currentUser.username, status: 'Falha', details: errorDetail });
                setImportLogs(db.getImportLogs());
                setStatus(errorDetail);
                setImportResult({ added: 0, updated: 0, errors: [error.message], processed: 0 });
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = ''; // Reset file input
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-2xl font-bold mb-2">Cadastro de Clientes</h2>
                <p className="mb-4 text-muted-foreground">
                    Importe ou atualize a base de clientes via planilha XLSX. Use o template para garantir o formato correto.
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4">
                     <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="hidden"
                    />
                    <Button onClick={handleDownloadTemplate} variant="ghost">
                        <DownloadIcon className="w-5 h-5 mr-2" />
                        Baixar Template
                    </Button>
                    <Button onClick={triggerFileInput} variant="secondary">
                        <UploadIcon className="w-5 h-5 mr-2" />
                        Selecionar Arquivo
                    </Button>
                    <Button onClick={handleImport} disabled={!fileName || status.startsWith('Processando')}>
                        Importar Planilha
                    </Button>
                </div>
                 {fileName && <p className="mt-4 text-sm text-muted-foreground">{status}</p>}

                 {importResult && (
                    <div className="mt-4 p-4 border rounded-lg bg-secondary/50 border-border">
                        <h4 className="font-semibold text-foreground mb-2">Resumo da Importação</h4>
                        <ul className="space-y-1 text-sm list-disc list-inside">
                            <li><span className="font-medium">{importResult.processed}</span> registros lidos da planilha.</li>
                            <li className="text-success"><span className="font-medium">{importResult.added}</span> clientes novos adicionados.</li>
                            <li className="text-chart-5"><span className="font-medium">{importResult.updated}</span> clientes existentes atualizados.</li>
                            {importResult.errors.length > 0 && (
                                <li className="text-destructive mt-2">
                                    <span className="font-medium">{importResult.errors.length} Erros Encontrados:</span>
                                    <ul className="pl-5 mt-1 space-y-1 text-xs list-disc list-inside max-h-40 overflow-y-auto">
                                        {importResult.errors.slice(0, 10).map((err, i) => <li key={i} className="break-words">{err}</li>)}
                                        {importResult.errors.length > 10 && <li>... e mais {importResult.errors.length - 10} erros.</li>}
                                    </ul>
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </Card>

            <Card>
                <h3 className="text-xl font-bold mb-4">Base de Clientes Atual</h3>
                <p className="text-muted-foreground mb-4">Total de {clientes.length} clientes cadastrados.</p>
                <div className="overflow-x-auto max-h-96">
                     <table className="w-full text-sm text-left text-muted-foreground">
                        <thead className="text-xs uppercase bg-secondary text-secondary-foreground sticky top-0">
                            <tr>
                               <th className="px-4 py-2">Código BW</th>
                               <th className="px-4 py-2">Nome Fantasia</th>
                               <th className="px-4 py-2">Cidade</th>
                               <th className="px-4 py-2">Canal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientes.slice(0, 100).map((cliente, index) => (
                                <tr key={cliente['Codigo-BW'] || index} className="border-b border-border">
                                    <td className="px-4 py-2 font-medium text-foreground">{cliente['Codigo-BW']}</td>
                                    <td className="px-4 py-2">{cliente['Nome Fantasia']}</td>
                                    <td className="px-4 py-2">{cliente['Cidade']}</td>
                                    <td className="px-4 py-2">{cliente['Canal']}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {clientes.length === 0 && <p className="text-center text-sm py-4">Nenhum cliente cadastrado.</p>}
                    {clientes.length > 100 && <p className="text-center text-xs mt-2 text-muted-foreground">Exibindo os primeiros 100 de {clientes.length} registros.</p>}
                </div>
            </Card>
            
            <Card>
                <h3 className="text-xl font-bold mb-4">Histórico de Importações</h3>
                <div className="overflow-y-auto max-h-80">
                    <ul className="space-y-3">
                        {importLogs.map(log => (
                            <li key={log.id} className={`p-3 rounded-lg border ${log.status === 'Sucesso' ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}`}>
                                <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                                    <span>{new Date(log.timestamp).toLocaleString('pt-BR')} por <strong className="text-foreground">{log.user}</strong></span>
                                    <span className={`font-semibold ${log.status === 'Sucesso' ? 'text-success' : 'text-destructive'}`}>{log.status}</span>
                                </div>
                                <p className="text-sm text-foreground">{log.details}</p>
                            </li>
                        ))}
                         {importLogs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro de importação encontrado.</p>}
                    </ul>
                </div>
            </Card>
        </div>
    );
};

// --- Main Admin Panel Component ---
type AdminView = 'dashboard' | 'lancamentos' | 'usuarios' | 'exportar' | 'configuracoes';

interface AdminPanelProps {
    currentUser: CurrentUser;
}

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
    
    // Close sidebar on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSidebarOpen(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const NavItem: React.FC<{ view: AdminView; icon: React.ReactNode; label: string }> = ({ view, icon, label }) => (
        <li>
            <a
                href="#"
                onClick={(e) => { e.preventDefault(); setActiveView(view); setSidebarOpen(false); }}
                className={`flex items-center p-3 text-foreground/80 hover:bg-accent transition-colors rounded-md ${activeView === view ? 'bg-primary text-primary-foreground font-semibold' : ''}`}
            >
                <span className="w-6 h-6 mr-3">{icon}</span>
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
        <div className="flex min-h-[calc(100vh-200px)]">
            {sidebarOpen && (
                 <div
                    className="fixed inset-0 bg-black/60 z-10 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}
             <aside className={`fixed md:relative z-20 w-64 bg-card border-r border-border flex-shrink-0 transition-transform transform ${ sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 h-full flex flex-col`}>
                <div className="p-5 text-xl font-semibold border-b border-border flex-shrink-0">Admin</div>
                <nav className="p-4 overflow-y-auto">
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
            <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2.5 mb-4 bg-card rounded-md md:hidden text-muted-foreground border border-border">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                </button>
                {renderContent()}
            </main>
        </div>
    );
};