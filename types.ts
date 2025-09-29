export type UserRole = 'user' | 'admin' | 'super-admin';

export interface User {
  id: string;
  email: string;
  username: string;
  password: string; 
  role: UserRole;
}

export interface CurrentUser {
  id: string;
  username: string;
  role: UserRole;
}

export interface Produto {
  codigo: string;
  titulo: string;
  descricao: string;
  imagem_url: string;
}

export type LancamentoTipo = 'Venda' | 'Bonificação' | 'Troca' | 'Reposição';

export type LancamentoStatus = 'Pendente' | 'Aprovado' | 'Cancelar';

export interface LancamentoProduto {
  codigo: string;
  titulo: string;
  descricao: string;
  qtd_cx: number;
  qtd_und: number;
  tipo: LancamentoTipo;
  valor_cents: number;
}

export interface Lancamento {
  id: string;
  data: string; // ISO string
  userId: string;
  username: string;
  codigo_cliente: string;
  descricao: string;
  status: LancamentoStatus;
  produtos: LancamentoProduto[];
}


// --- New Types for Client Management ---

export interface Cliente {
  'Codigo-BW': string; // Primary Key
  'Codigo'?: string;
  'CNPJ/CPF'?: string;
  'Nome Fantasia'?: string;
  'Razão Social'?: string;
  'Vend'?: string;
  'Superv'?: string;
  'Dia Visita'?: string;
  'Segmentação Potencial'?: string;
  'Canal'?: string;
  'Canais'?: string;
  'Cidade'?: string;
  'Tel 1'?: string;
}

export interface ImportLog {
  id: string;
  timestamp: string; // ISO string
  user: string;
  status: 'Sucesso' | 'Falha';
  details: string; // e.g., "Importado 500 registros." or "Erro na linha 10: Campo 'Codigo-BW' faltando."
}
