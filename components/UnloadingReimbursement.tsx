import React, { useState, useMemo } from 'react';
import { Rota, Despesa, TipoDespesa, Veiculo, Motorista } from '../types';
import { Mail, Copy, Check, Info, FileText, Calendar, Clock, ExternalLink, Truck, Receipt, TrendingUp, Package, AlertCircle, Download } from 'lucide-react';
import { servicoFinanceiro } from '../services/financialService';
import { servicoRotas } from '../services/routeService';

interface UnloadingReimbursementProps {
    routes: Rota[];
    expenses: Despesa[];
    vehicles: Veiculo[];
    drivers: Motorista[];
    onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
    onRefresh?: () => void;
}

export const UnloadingReimbursement: React.FC<UnloadingReimbursementProps> = ({
    routes,
    expenses,
    vehicles,
    drivers,
    onAddToast,
    onRefresh
}) => {
    const [requestType, setRequestType] = useState<'descarga' | 'km_perdido' | 'mercadoria_paga'>('descarga');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [copied, setCopied] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Logical arguments for KM Perdido
    const justifications = [
        "Desvios de trânsito devido a obras emergenciais na via principal.",
        "Rotas alternativas por conta de acidentes no trajeto original.",
        "Bloqueio temporário de pista, exigindo redirecionamento por via secundária.",
        "Interdição parcial de trechos urbanos, forçando o uso de rotas de contorno.",
        "Eventos imprevistos e obras de manutenção na pista que exigiram desvios longos.",
        "Aumento de percurso devido a restrições de tráfego pesado em horários comerciais."
    ];

    const getJustification = (seed: string) => {
        const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % justifications.length;
        return justifications[index];
    };

    // Filter and Map items based on type
    const displayItems = useMemo(() => {
        if (requestType === 'descarga') {
            return expenses
                .filter(e => e.tipo === TipoDespesa.DESCARGA)
                .filter(e => {
                    const date = e.date;
                    if (startDate && date < startDate) return false;
                    if (endDate && date > endDate) return false;
                    return true;
                })
                .map(e => {
                    const route = routes.find(r => r.id === e.rotaId);
                    const vehicle = vehicles.find(v => v.id === route?.vehicle_id || v.plate === route?.plate);
                    return {
                        id: e.id,
                        title: `Rota ${route?.route_number || 'S/N'}`,
                        date: e.date,
                        createdAt: e.createdAt,
                        value: e.valor,
                        plate: vehicle?.plate || '-',
                        model: vehicle?.model || '',
                        routeNumber: route?.route_number,
                        imgUrl: e.img_url,
                        reimbursementSent: e.reimbursement_sent
                    };
                })
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } else if (requestType === 'mercadoria_paga') {
            return expenses
                .filter(e => e.tipo === TipoDespesa.MERCADORIA_PAGA)
                .filter(e => {
                    const date = e.date;
                    if (startDate && date < startDate) return false;
                    if (endDate && date > endDate) return false;
                    return true;
                })
                .map(e => {
                    const route = routes.find(r => r.id === e.rotaId);
                    const vehicle = vehicles.find(v => v.id === route?.vehicle_id || v.plate === route?.plate);
                    const driver = drivers.find(d => d.id === e.motoristaId || d.id === route?.driver_id);
                    return {
                        id: e.id,
                        title: `Rota ${route?.route_number || 'S/N'}`,
                        date: e.date,
                        createdAt: e.createdAt,
                        value: e.valor,
                        plate: vehicle?.plate || '-',
                        model: vehicle?.model || '',
                        routeNumber: route?.route_number,
                        driverName: driver?.nome || 'Não identificado',
                        description: e.observacoes || 'Sem descrição',
                        imgUrl: e.img_url,
                        reimbursementSent: e.reimbursement_sent
                    };
                })
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } else {
            // KM Perdido Logic
            return routes
                .filter(r => {
                    if (startDate && r.date < startDate) return false;
                    if (endDate && r.date > endDate) return false;
                    if (!r.initial_km || !r.final_km || !r.km_final_seara) return false;
                    const realKm = r.final_km - r.initial_km;
                    return realKm > r.km_final_seara;
                })
                .map(r => {
                    const vehicle = vehicles.find(v => v.id === r.vehicle_id || v.plate === r.plate);
                    const realKm = (r.final_km || 0) - (r.initial_km || 0);
                    const lostKm = Math.max(0, realKm - (r.km_final_seara || 0));
                    const value = lostKm * (vehicle?.km_rate || 0);

                    return {
                        id: r.id,
                        title: `Rota ${r.route_number || 'S/N'}`,
                        date: r.date,
                        value: value,
                        lostKm: lostKm,
                        realKm: realKm,
                        searaKm: r.km_final_seara,
                        plate: vehicle?.plate || '-',
                        model: vehicle?.model || '',
                        routeNumber: r.route_number,
                        justification: getJustification(r.id),
                        reimbursementSent: r.reimbursement_sent
                    };
                })
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
    }, [expenses, routes, vehicles, startDate, endDate, requestType]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selectedItems = displayItems.filter(e => selectedIds.includes(e.id));

    const generatedText = useMemo(() => {
        if (selectedItems.length === 0) return '';

        let text = "Prezados,\n\n";

        if (requestType === 'descarga') {
            text += "Encaminhamos, para análise e providências, a solicitação de reembolso referente à despesa com descarga, vinculada aos serviços prestados, conforme detalhamento abaixo:\n\n";
        } else if (requestType === 'km_perdido') {
            text += "Encaminhamos, para análise e providências, a solicitação de reembolso referente ao excedente de quilometragem (KM Perdido) vinculada aos serviços prestados, conforme detalhamento abaixo:\n\n";
        } else {
            text += "Encaminhamos, para análise e providências, a solicitação de reembolso referente à mercadoria paga antecipadamente pelo motorista, visando evitar a devolução total. Solicitamos o reembolso conforme detalhamento abaixo:\n\n";
        }

        selectedItems.forEach((item, index) => {
            const dateFormatted = new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR');

            text += `Item ${index + 1}\n`;
            text += `Rota: ${item.routeNumber || 'Não informada'}\n`;
            text += `Data da Rota: ${dateFormatted}\n`;
            text += `Veículo: ${item.plate} (${item.model})\n`;

            if (requestType === 'descarga') {
                const anyItem = item as any;
                const timeFormatted = anyItem.createdAt ? new Date(anyItem.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                text += `Valor: R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                text += `Comprovante: encaminhado em ${dateFormatted}, às ${timeFormatted}\n`;
                if (anyItem.imgUrl) {
                    text += `Link para acesso ao comprovante:\n${anyItem.imgUrl}\n`;
                }
            } else if (requestType === 'mercadoria_paga') {
                const anyItem = item as any;
                text += `Motorista: ${anyItem.driverName}\n`;
                text += `Valor Pago: R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                text += `Descrição: ${anyItem.description}\n`;
                if (anyItem.imgUrl) {
                    text += `Link para acesso ao comprovante:\n${anyItem.imgUrl}\n`;
                }
            } else {
                const anyItem = item as any;
                text += `KM Realizado: ${anyItem.realKm} km\n`;
                text += `KM Seara: ${anyItem.searaKm} km\n`;
                text += `Diferença (KM Perdido): ${anyItem.lostKm} km\n`;
                text += `Valor do Reembolso: R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                text += `Justificativa: ${anyItem.justification}\n`;
            }
            text += "\n";
        });

        text += "Permanecemos à disposição para quaisquer esclarecimentos adicionais.\n\n";
        text += "Atenciosamente,\n";
        text += "Administração: ALC & PERERIRA FILHO TRANSPORTES";
        return text;
    }, [selectedItems, requestType]);

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedText);
        setCopied(true);
        onAddToast('Texto copiado para a área de transferência!', 'success');
        setTimeout(() => setCopied(false), 2000);
        setTimeout(() => setShowConfirmModal(true), 1000);
    };

    const handleSendEmail = () => {
        let subjectPrefix = 'Descarga';
        if (requestType === 'km_perdido') subjectPrefix = 'KM Perdido';
        if (requestType === 'mercadoria_paga') subjectPrefix = 'Mercadoria Paga';

        const subject = encodeURIComponent(`Solicitação de Reembolso ${subjectPrefix} - ALC SEARA`);
        const body = encodeURIComponent(generatedText);
        window.location.href = `mailto:financeiro@exemplo.com?subject=${subject}&body=${body}`;
        setTimeout(() => setShowConfirmModal(true), 1500);
    };

    const handleMarkAsSent = async () => {
        try {
            if (requestType === 'km_perdido') {
                await servicoRotas.marcarRotasComoEnviadas(selectedIds);
            } else {
                await servicoFinanceiro.marcarDespesasComoEnviadas(selectedIds);
            }
            onAddToast('Status atualizado com sucesso!', 'success');
            setShowConfirmModal(false);
            setSelectedIds([]);
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Erro ao marcar como enviado:', err);
            onAddToast('Erro ao atualizar status.', 'error');
        }
    };

    const handleExportExcel = () => {
        const bom = '\uFEFF'; // BOM for UTF-8 Excel recognition
        const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        let filename = '';
        let headers: string[] = [];
        let rows: string[][] = [];

        const fmtDate = (d: string) => {
            try { return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR'); } catch { return d; }
        };
        const fmtCurrency = (v: number) =>
            v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const fmtTime = (iso: string) => {
            try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch { return '-'; }
        };

        if (requestType === 'descarga') {
            filename = `Reembolso_Descarga_${dateStr}.csv`;
            headers = ['Nº Rota', 'Data', 'Horário', 'Placa', 'Modelo', 'Valor (R$)', 'Status', 'Comprovante'];
            rows = displayItems.map(item => {
                const any = item as any;
                return [
                    item.routeNumber || 'S/N',
                    fmtDate(item.date),
                    any.createdAt ? fmtTime(any.createdAt) : '-',
                    item.plate,
                    item.model || '-',
                    fmtCurrency(item.value),
                    item.reimbursementSent ? 'ENVIADO' : 'NÃO ENVIADO',
                    any.imgUrl || '-'
                ];
            });
        } else if (requestType === 'km_perdido') {
            filename = `Reembolso_KM_Perdido_${dateStr}.csv`;
            headers = ['Nº Rota', 'Data', 'Placa', 'Modelo', 'KM Real', 'KM Seara', 'KM Perdido', 'Valor (R$)', 'Status'];
            rows = displayItems.map(item => {
                const any = item as any;
                return [
                    item.routeNumber || 'S/N',
                    fmtDate(item.date),
                    item.plate,
                    item.model || '-',
                    String(any.realKm ?? '-'),
                    String(any.searaKm ?? '-'),
                    String(any.lostKm ?? '-'),
                    fmtCurrency(item.value),
                    item.reimbursementSent ? 'ENVIADO' : 'NÃO ENVIADO'
                ];
            });
        } else {
            filename = `Reembolso_Mercadoria_Paga_${dateStr}.csv`;
            headers = ['Nº Rota', 'Data', 'Placa', 'Modelo', 'Motorista', 'Descrição', 'Valor (R$)', 'Status', 'Comprovante'];
            rows = displayItems.map(item => {
                const any = item as any;
                return [
                    item.routeNumber || 'S/N',
                    fmtDate(item.date),
                    item.plate,
                    item.model || '-',
                    any.driverName || '-',
                    any.description || '-',
                    fmtCurrency(item.value),
                    item.reimbursementSent ? 'ENVIADO' : 'NÃO ENVIADO',
                    any.imgUrl || '-'
                ];
            });
        }

        // Calculate total
        const total = displayItems.reduce((acc, i) => acc + i.value, 0);
        const totalLabel = requestType === 'descarga'
            ? 'TOTAL DESCARGA'
            : requestType === 'km_perdido'
                ? 'TOTAL KM PERDIDO'
                : 'TOTAL MERCADORIA PAGA';

        const escapeCell = (v: string) => {
            if (v.includes(';') || v.includes('"') || v.includes('\n')) {
                return `"${v.replace(/"/g, '""')}"`;
            }
            return v;
        };

        const csvLines = [
            headers.map(escapeCell).join(';'),
            ...rows.map(r => r.map(escapeCell).join(';')),
            '', // blank separator
            `${totalLabel};${fmtCurrency(total)}`
        ];

        const blob = new Blob([bom + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        onAddToast(`Excel exportado: ${filename}`, 'success');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">E-mail enviado?</h3>
                            <p className="text-gray-500 mb-6">Você gostaria de marcar estes itens como "Enviados"?</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
                                >
                                    Não
                                </button>
                                <button
                                    onClick={handleMarkAsSent}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-200"
                                >
                                    Sim, marcar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* List Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Header with Search and Request Type Tabs */}
                <div className="bg-gray-50/50 border-b border-gray-100">
                    <div className="p-1 flex gap-1">
                        <button
                            onClick={() => { setRequestType('descarga'); setSelectedIds([]); }}
                            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${requestType === 'descarga' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Receipt className="w-4 h-4" /> REEMBOLSO DESCARGA
                        </button>
                        <button
                            onClick={() => { setRequestType('km_perdido'); setSelectedIds([]); }}
                            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${requestType === 'km_perdido' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <TrendingUp className="w-4 h-4" /> REEMBOLSO KM PERDIDO
                        </button>
                        <button
                            onClick={() => { setRequestType('mercadoria_paga'); setSelectedIds([]); }}
                            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${requestType === 'mercadoria_paga' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Package className="w-4 h-4" /> REEMBOLSO MERCADORIA PAGA
                        </button>
                    </div>

                    <div className="p-6 pt-4 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">
                                {requestType === 'descarga' ? 'Despesas de Descarga' : requestType === 'km_perdido' ? 'Ajustes de KM Perdido' : 'Mercadoria Paga no Local'}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {requestType === 'descarga'
                                    ? 'Selecione os comprovantes para solicitar reembolso'
                                    : requestType === 'km_perdido'
                                        ? 'Diferença entre KM Real e KM pago pela Seara'
                                        : 'Artigos pagos para evitar devolução total'
                                }
                            </p>
                        </div>
                        <div className="flex items-end gap-2">
                            <div className="flex flex-col">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Início</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Fim</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <button
                                onClick={handleExportExcel}
                                disabled={displayItems.length === 0}
                                title={`Baixar Excel - ${requestType === 'descarga' ? 'Reembolso Descarga' : requestType === 'km_perdido' ? 'Reembolso KM Perdido' : 'Reembolso Mercadoria Paga'}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Excel
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-50">
                    {displayItems.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <Info className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Nenhum item encontrado para os filtros selecionados.</p>
                        </div>
                    ) : (
                        displayItems.map(item => (
                            <div
                                key={item.id}
                                className={`p-4 transition-colors cursor-pointer hover:bg-gray-50 flex items-center gap-4 ${selectedIds.includes(item.id) ? 'bg-blue-50/50' : ''}`}
                                onClick={() => toggleSelect(item.id)}
                            >
                                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${selectedIds.includes(item.id) ? 'bg-blue-600 border-blue-600 shadow-sm' : 'border-gray-200'}`}>
                                    {selectedIds.includes(item.id) && <Check className="w-4 h-4 text-white" />}
                                </div>

                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-gray-900">{item.title}</span>
                                                {item.reimbursementSent ? (
                                                    <span className="flex items-center gap-0.5 px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[10px] font-bold border border-green-100">
                                                        <Check className="w-2.5 h-2.5" /> ENVIADO
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-0.5 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold border border-amber-100">
                                                        <AlertCircle className="w-2.5 h-2.5" /> NÃO ENVIADO
                                                    </span>
                                                )}
                                            </div>
                                            {requestType === 'km_perdido' && (
                                                <span className="text-[11px] text-gray-500">Diferença: {(item as any).lostKm} km</span>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm font-bold text-blue-600">
                                                R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                        <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {item.plate}</span>
                                        {(item as any).createdAt && (
                                            <span className="flex items-center gap-1 text-orange-600 font-medium">
                                                <Clock className="w-3 h-3" /> {new Date((item as any).createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {(item as any).imgUrl && (
                                    <a
                                        href={(item as any).imgUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Preview Section */}
            <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-[600px]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" /> Pré-visualização do E-mail
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={handleCopy}
                                disabled={!generatedText}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all disabled:opacity-50"
                            >
                                {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                {copied ? 'Copiado!' : 'Copiar'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-gray-50 rounded-xl p-6 font-mono text-sm overflow-y-auto border border-gray-100 text-gray-700 whitespace-pre-wrap leading-relaxed shadow-inner">
                        {generatedText || (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 italic">
                                <Mail className="w-12 h-12 opacity-10" />
                                <p>Selecione ao menos um item para gerar o rascunho</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={handleSendEmail}
                            disabled={!generatedText}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all transform active:scale-[0.98] disabled:bg-gray-200 disabled:shadow-none"
                        >
                            <Mail className="w-5 h-5" /> Enviar por E-mail
                        </button>
                        <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                            <Info className="w-3 h-3" /> Isso abrirá o seu cliente de e-mail padrão.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
