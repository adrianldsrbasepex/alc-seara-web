import React, { useState } from 'react';
import { Truck, MapPin, Calendar, Camera, Search, LogOut, CheckCircle, AlertTriangle } from 'lucide-react';
import { Rota, Usuario } from '../types';
import { servicoManobrista } from '../services/shunterService';
import { uploadReceipt } from '../lib/uploadReceipt';
import { Toast, ToastContainer, ToastType } from './Toast';

interface ShunterPanelProps {
    shunter: Usuario;
    onLogout: () => void;
}

export const ShunterPanel: React.FC<ShunterPanelProps> = ({ shunter, onLogout }) => {
    const [routeNumber, setRouteNumber] = useState('');
    const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0]);
    const [foundRoute, setFoundRoute] = useState<(Rota & { drivers: { name: string } }) | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Photos State
    const [bodyPhoto, setBodyPhoto] = useState<File | null>(null);
    const [bodyPreview, setBodyPreview] = useState<string>('');
    const [boxesPhoto, setBoxesPhoto] = useState<File | null>(null);
    const [boxesPreview, setBoxesPreview] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addToast = (message: string, type: ToastType) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!routeNumber || !routeDate) return;

        setIsSearching(true);
        setFoundRoute(null);
        setBodyPhoto(null);
        setBodyPreview('');
        setBoxesPhoto(null);
        setBoxesPreview('');

        try {
            // 1. Tentar busca exata por ID e Data
            let route = await servicoManobrista.buscarRotaParaVerificacao(routeNumber, routeDate);

            // 2. Se não encontrar, tentar busca apenas por ID
            if (!route) {
                route = await servicoManobrista.buscarRotaParaVerificacao(routeNumber);
                if (route) {
                    addToast(`Atenção: Rota encontrada, mas com data diferente (${new Date(route.date).toLocaleDateString('pt-BR')})`, "warning");
                }
            }

            if (route) {
                setFoundRoute(route);
                if (!route.leftover_photo_url) {
                    addToast("Esta rota não possui sobra registrada pelo motorista.", "info");
                }
            } else {
                addToast("Rota não encontrada para os dados informados.", "error");
            }
        } catch (error) {
            console.error("Error searching route:", error);
            addToast("Erro ao buscar rota.", "error");
        } finally {
            setIsSearching(false);
        }
    };

    const handlePhotoChange = (file: File, type: 'body' | 'boxes') => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'body') {
                setBodyPhoto(file);
                setBodyPreview(reader.result as string);
            } else {
                setBoxesPhoto(file);
                setBoxesPreview(reader.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!foundRoute || !bodyPhoto || !boxesPhoto) {
            addToast("As fotos do baú e das caixas são obrigatórias.", "warning");
            return;
        }

        setIsSubmitting(true);
        try {
            // Upload photos
            const bodyUrl = await uploadReceipt(bodyPhoto, `shunter_body_${foundRoute.id}`);
            const boxesUrl = await uploadReceipt(boxesPhoto, `shunter_boxes_${foundRoute.id}`);

            // Save verification
            await servicoManobrista.salvarVerificacao(foundRoute.id, shunter.id, bodyUrl, boxesUrl);

            addToast("Verificação salva com sucesso!", "success");

            // Reset after success
            setFoundRoute(null);
            setRouteNumber('');
            setBodyPhoto(null);
            setBodyPreview('');
            setBoxesPhoto(null);
            setBoxesPreview('');
        } catch (error) {
            console.error("Error saving verification:", error);
            addToast("Erro ao salvar verificação.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 relative">
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {/* Header */}
            <header className="bg-[#0A192F] text-white p-5 sticky top-0 z-10 shadow-lg">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-xl font-black">
                            {shunter.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="font-bold text-lg">{shunter.nome}</h2>
                            <span className="text-xs text-orange-400 font-medium uppercase tracking-widest">Painel Manobrista</span>
                        </div>
                    </div>
                    <button onClick={onLogout} className="p-2.5 hover:bg-white/10 rounded-xl transition-all border border-white/10" title="Sair">
                        <LogOut className="w-5 h-5 opacity-80" />
                    </button>
                </div>
            </header>

            <main className="max-w-xl mx-auto p-4 md:p-8">
                {/* Search Card */}
                <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-8 mb-8">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                            <Search className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Buscar Entrega</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Informe os dados da rota</p>
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">ID ROTA</label>
                                <input
                                    type="text"
                                    required
                                    value={routeNumber}
                                    onChange={(e) => setRouteNumber(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-sm text-gray-900 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                                    placeholder="Ex: 884321"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">DATA</label>
                                <input
                                    type="date"
                                    required
                                    value={routeDate}
                                    onChange={(e) => setRouteDate(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-sm text-gray-900 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSearching}
                            className="w-full bg-[#1A1A1A] text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3"
                        >
                            {isSearching ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (
                                <>
                                    <Search className="w-5 h-5" />
                                    Localizar Rota
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Route Details and Verification */}
                {foundRoute && (
                    <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                        <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">DADOS DA ENTREGA</span>
                                    <h4 className="text-2xl font-black text-gray-900 tracking-tight mt-1">Rota #{foundRoute.route_number}</h4>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${foundRoute.leftover_photo_url ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                    {foundRoute.leftover_photo_url ? 'COM SOBRA' : 'SEM SOBRA'}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-gray-600">
                                    <Truck className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-bold">{foundRoute.drivers?.name || foundRoute.original_driver_name || 'Motorista não identificado'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-600">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-bold">{foundRoute.destination}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-8">
                            {foundRoute.leftover_photo_url ? (
                                <form onSubmit={handleSubmit} className="space-y-8">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Foto do Baú (Vazio ou com Sobra)</label>
                                            <label className="aspect-video rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500/30 hover:bg-blue-50/20 transition-all group overflow-hidden relative">
                                                {bodyPreview ? (
                                                    <img src={bodyPreview} alt="Baú" className="absolute inset-0 w-full h-full object-cover" />
                                                ) : (
                                                    <>
                                                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                                            <Camera className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                                                        </div>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tirar Foto do Baú</span>
                                                    </>
                                                )}
                                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handlePhotoChange(e.target.files[0], 'body')} />
                                            </label>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Foto das Caixas Sobrantes</label>
                                            <label className="aspect-video rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500/30 hover:bg-blue-50/20 transition-all group overflow-hidden relative">
                                                {boxesPreview ? (
                                                    <img src={boxesPreview} alt="Caixas" className="absolute inset-0 w-full h-full object-cover" />
                                                ) : (
                                                    <>
                                                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                                            <Camera className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                                                        </div>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tirar Foto das Caixas</span>
                                                    </>
                                                )}
                                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handlePhotoChange(e.target.files[0], 'boxes')} />
                                            </label>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !bodyPhoto || !boxesPhoto}
                                        className="w-full bg-[#00A859] text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-[#008f4c] disabled:opacity-50 transition-all shadow-xl shadow-green-100 flex items-center justify-center gap-3"
                                    >
                                        {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (
                                            <>
                                                <CheckCircle className="w-5 h-5" />
                                                Confirmar Verificação
                                            </>
                                        )}
                                    </button>
                                </form>
                            ) : (
                                <div className="text-center py-10">
                                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle className="w-10 h-10 text-green-500" />
                                    </div>
                                    <h4 className="text-lg font-black text-gray-900 mb-2">Atenção!</h4>
                                    <p className="text-sm font-bold text-gray-400 px-6">Esta rota já foi finalizada sem sobras registradas. Não é necessário realizar a verificação do Manobrista.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
