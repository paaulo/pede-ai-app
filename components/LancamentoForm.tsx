import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../services/db';
import { Produto, LancamentoProduto, CurrentUser, LancamentoTipo } from '../types';
import { LANCAMENTO_TIPOS } from '../constants';
import { SearchIcon } from './icons';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Select } from './ui/Select';
import { FormGroup } from './ui/FormGroup';
import { ErrorMessage } from './ui/ErrorMessage';
import { Label } from './ui/Label';

interface LancamentoFormProps {
    currentUser: CurrentUser;
}

// --- Helper Functions ---
const emojiRegex = /\p{Extended_Pictographic}|\p{Emoji_Presentation}/gu;
const normalizeText = (text: string) => (text || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const formatCurrencyBRL = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const parseCurrencyToCents = (str: string) => {
    if (!str) return 0;
    const onlyDigits = str.toString().replace(/\D/g, '');
    return Number(onlyDigits);
};
const maskCodigoCliente = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const part1 = digits.slice(0, 4);
    const part2 = digits.slice(4, 8);
    return part2 ? `${part1}-${part2}` : part1;
};

// --- Product Search Component ---
const ProductSearch: React.FC<{ onSelectProduct: (product: Produto) => void }> = ({ onSelectProduct }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Produto[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceTimeoutRef = useRef<number | null>(null);

    const allProducts = db.getProdutos();

    const getRandomProducts = useCallback(() => {
        const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 3);
    }, [allProducts]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        setIsLoading(true);

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = window.setTimeout(() => {
            if (!term) {
                setResults(getRandomProducts());
                setIsLoading(false);
                return;
            }
            const normalizedTerm = normalizeText(term);
            const filtered = allProducts.filter(p => {
                const hay = `${p.titulo} ${p.codigo} ${p.descricao}`;
                return normalizeText(hay).includes(normalizedTerm);
            });
            setResults(filtered.slice(0, 50));
            setIsLoading(false);
        }, 300); // 300ms debounce
    };


    const handleSelect = (product: Produto) => {
        onSelectProduct(product);
        setSearchTerm(`${product.titulo} • ${product.codigo}`);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={searchRef}>
            <Label htmlFor="product-search">Produto</Label>
            <div className="relative">
                <Input
                    id="product-search"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => { if(!searchTerm) { setResults(getRandomProducts()); } setIsOpen(true); }}
                    placeholder="Buscar por título, código ou descrição"
                    className="pr-10"
                />
                <SearchIcon className="absolute w-5 h-5 text-muted-foreground top-3.5 right-3.5" />
            </div>
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto">
                    {isLoading ? (
                        <p className="p-4 text-muted-foreground">Carregando...</p>
                    ) : results.length > 0 ? results.map(product => (
                        <div key={product.codigo} onClick={() => handleSelect(product)} className="flex items-center p-3 border-b border-border cursor-pointer hover:bg-accent">
                            <img src={product.imagem_url} alt={product.titulo} className="object-contain w-16 h-16 p-1 mr-4 bg-secondary rounded-md" />
                            <div className="flex-1">
                                <p className="font-semibold text-popover-foreground">{product.titulo}</p>
                                <p className="text-sm text-muted-foreground">{product.descricao}</p>
                                <p className="text-xs text-muted-foreground/80">{product.codigo}</p>
                            </div>
                        </div>
                    )) : (
                        <p className="p-4 text-muted-foreground">Nenhum produto encontrado.</p>
                    )}
                </div>
            )}
        </div>
    );
};

// --- Main Form Component ---
export const LancamentoForm: React.FC<LancamentoFormProps> = ({ currentUser }) => {
    const [feedback, setFeedback] = useState('');

    // Form State
    const [codigoCliente, setCodigoCliente] = useState('');
    const [produtosAdicionados, setProdutosAdicionados] = useState<LancamentoProduto[]>([]);
    
    // Product Temp State
    const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
    const [qtdCx, setQtdCx] = useState('');
    const [qtdUnd, setQtdUnd] = useState('');
    const [tipo, setTipo] = useState<LancamentoTipo | ''>('');
    const [valorNegociado, setValorNegociado] = useState('');
    const [justificativa, setJustificativa] = useState('');

    // Validation State
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const resetForm = () => {
        setCodigoCliente('');
        setProdutosAdicionados([]);
        resetProductFields();
        setFeedback('');
        setErrors({});
    };

    const resetProductFields = () => {
        setSelectedProduct(null);
        setQtdCx('');
        setQtdUnd('');
        setTipo('');
        setValorNegociado('');
        setJustificativa('');
    };

    const handleAddProduct = () => {
        const newErrors: { [key: string]: string } = {};
        if (!selectedProduct) return;
        if (!qtdCx && !qtdUnd) {
            newErrors.quantidade = 'Informe ao menos Qtd CX ou Qtd Und.';
        }
        if (Number(qtdCx) <= 0 && Number(qtdUnd) <= 0) {
            newErrors.quantidade = 'A quantidade deve ser maior que zero.';
        }
        if (!tipo) {
            newErrors.tipo = 'Selecione o Tipo.';
        }
        if (tipo === 'Venda' && parseCurrencyToCents(valorNegociado) <= 0) {
            newErrors.valor = 'Para Vendas, o Valor Negociado é obrigatório.';
        }
        if (!justificativa.trim()) {
            newErrors.justificativa = 'A Justificativa é obrigatória.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const newProduct: LancamentoProduto = {
            codigo: selectedProduct!.codigo,
            titulo: selectedProduct!.titulo,
            descricao: selectedProduct!.descricao,
            qtd_cx: Number(qtdCx) || 0,
            qtd_und: Number(qtdUnd) || 0,
            tipo: tipo as LancamentoTipo,
            valor_cents: parseCurrencyToCents(valorNegociado),
            status: 'Pendente' as const,
            justificativa: justificativa.trim(),
        };
        setProdutosAdicionados(prev => [...prev, newProduct]);
        resetProductFields();
        setErrors({});
    };

    const handleRemoveProduct = (index: number) => {
        setProdutosAdicionados(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveLancamento = () => {
        setFeedback('');
        const newErrors: { [key: string]: string } = {};
        if (!/^\d{4}-\d{4}$/.test(codigoCliente)) {
            newErrors.codigoCliente = 'Informe 8 dígitos (formato 0000-0000).';
        }
        if (produtosAdicionados.length === 0) {
            newErrors.produtos = 'Adicione ao menos um produto.';
        }
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const newLancamento = {
            id: crypto.randomUUID(),
            data: new Date().toISOString(),
            userId: currentUser.id,
            username: currentUser.username,
            codigo_cliente: codigoCliente,
            produtos: produtosAdicionados,
        };

        db.addLancamento(newLancamento);
        setFeedback('Lançamento salvo com sucesso!');
        resetForm();
        setTimeout(() => setFeedback(''), 3000);
    };

    return (
        <div className="p-4 sm:p-8">
            {feedback && <div className="p-4 mb-6 text-success-foreground bg-success/30 border border-success/50 rounded-lg">{feedback}</div>}

            <div className="grid grid-cols-1 gap-6">
                <FormGroup label="Código Cliente" htmlFor="codigo-cliente" error={errors.codigoCliente}>
                    <Input
                        id="codigo-cliente"
                        value={codigoCliente}
                        onChange={(e) => setCodigoCliente(maskCodigoCliente(e.target.value))}
                        placeholder="0000-0000"
                        maxLength={9}
                    />
                </FormGroup>
            </div>

            <div className="mt-6">
                <ProductSearch onSelectProduct={setSelectedProduct} />
            </div>

            {selectedProduct && (
                <div className="p-6 mt-6 bg-background border border-border rounded-lg">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                        <img src={selectedProduct.imagem_url} alt={selectedProduct.titulo} className="w-20 h-20 object-contain p-1 bg-secondary rounded-md shrink-0" />
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Detalhes do Produto Selecionado</h3>
                            <p className="text-sm text-muted-foreground">{selectedProduct.titulo}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <FormGroup label="Qtd CX" htmlFor="qtd-cx">
                           <Input type="number" id="qtd-cx" min="0" value={qtdCx} onChange={e => setQtdCx(e.target.value)} placeholder="0"/>
                        </FormGroup>
                         <FormGroup label="Qtd Und" htmlFor="qtd-und">
                           <Input type="number" id="qtd-und" min="0" value={qtdUnd} onChange={e => setQtdUnd(e.target.value)} placeholder="0"/>
                        </FormGroup>
                        <FormGroup label="Tipo" htmlFor="tipo">
                             <Select id="tipo" value={tipo} onChange={e => setTipo(e.target.value as LancamentoTipo | '')}>
                                <option value="">Selecione...</option>
                                {LANCAMENTO_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                            </Select>
                        </FormGroup>
                        <FormGroup label="Valor Negociado" htmlFor="valor-negociado">
                             <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">R$</span>
                                <Input id="valor-negociado" value={valorNegociado} onChange={e => setValorNegociado(e.target.value)} onBlur={e => setValorNegociado((parseCurrencyToCents(e.target.value) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))} placeholder="0,00" className="pl-10"/>
                            </div>
                        </FormGroup>
                    </div>
                     <div className="mt-6">
                        <FormGroup label="Descrição ou Justificativa" htmlFor="justificativa" error={errors.justificativa}>
                             <Textarea
                                id="justificativa"
                                value={justificativa}
                                onChange={(e) => setJustificativa(e.target.value.replace(emojiRegex, ''))}
                                maxLength={255}
                                rows={3}
                                placeholder="Descreva... (até 255 caracteres)"
                            />
                            <div className="mt-1 text-xs text-right text-muted-foreground">{justificativa.length}/255</div>
                        </FormGroup>
                    </div>
                    <ErrorMessage>{errors.quantidade}</ErrorMessage>
                    <ErrorMessage>{errors.tipo}</ErrorMessage>
                    <ErrorMessage>{errors.valor}</ErrorMessage>
                    <div className="mt-4 flex flex-col sm:flex-row gap-4">
                        <Button onClick={handleAddProduct} variant="success">Adicionar</Button>
                    </div>
                </div>
            )}
            
            <ErrorMessage>{errors.produtos}</ErrorMessage>

            <div className="mt-8">
                {produtosAdicionados.length > 0 && (
                     <div className="space-y-4">
                        {produtosAdicionados.map((p, index) => (
                             <div key={index} className="p-4 bg-secondary border border-border rounded-lg">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                                    <h4 className="font-semibold text-secondary-foreground">{p.titulo}</h4>
                                    <Button onClick={() => handleRemoveProduct(index)} variant="danger" className="px-3 py-1 text-xs font-medium self-end sm:self-center">Remover</Button>
                                </div>
                                <div className="grid grid-cols-2 text-sm text-muted-foreground gap-x-4 gap-y-1 md:grid-cols-5">
                                    <div><span className="font-medium text-secondary-foreground">Código:</span> {p.codigo}</div>
                                    <div><span className="font-medium text-secondary-foreground">Tipo:</span> {p.tipo}</div>
                                    <div><span className="font-medium text-secondary-foreground">Qtd CX:</span> {p.qtd_cx}</div>
                                    <div><span className="font-medium text-secondary-foreground">Qtd Und:</span> {p.qtd_und}</div>
                                    <div><span className="font-medium text-secondary-foreground">Valor:</span> {formatCurrencyBRL(p.valor_cents)}</div>
                                </div>
                                 <p className="mt-2 text-sm text-muted-foreground break-words">
                                    <span className="font-medium text-secondary-foreground">Justificativa:</span> {p.justificativa}
                                </p>
                             </div>
                        ))}
                     </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
                <Button onClick={handleSaveLancamento} className="w-full sm:w-auto">
                    Salvar Lançamento
                </Button>
                <Button onClick={resetForm} variant="secondary" className="w-full sm:w-auto">

                    Limpar
                </Button>
            </div>
        </div>
    );
};
