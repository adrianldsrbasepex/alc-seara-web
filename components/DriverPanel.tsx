// Developer: Adrian Luciano De Sena Ribeiro - MG | Tel: 31 995347802
import React, { useState, useEffect } from 'react';
import { Rota, Despesa, StatusRota, TipoDespesa, Motorista } from '../types';
import { servicoFrota, Veiculo } from '../services/fleetService';
import { Truck, MapPin, Calendar, DollarSign, PlusCircle, CheckCircle, AlertTriangle, Clock, LogOut, Moon, Plus, History, Receipt, ExternalLink, Camera, TrendingUp, X, RefreshCw } from 'lucide-react';
import { Toast, ToastContainer, ToastType } from './Toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { uploadReceipt } from '../lib/uploadReceipt';

interface DriverPanelProps {
  driver: Motorista;
  routes: Rota[];
  expenses: Despesa[];
  onUpdateRoute: (routeId: string, updates: Partial<Rota>) => void;
  onAddExpense: (expense: Omit<Despesa, 'id'>) => void;
  onAddRoute: (route: Omit<Rota, 'id'>) => void;
  onLogout: () => void;
}

const STATUS_COLORS = {
  [StatusRota.PENDENTE]: 'bg-gray-100 text-gray-600 border-gray-200',
  [StatusRota.EM_ANDAMENTO]: 'bg-blue-50 text-blue-700 border-blue-200',
  [StatusRota.PERNOITE]: 'bg-amber-50 text-amber-700 border-amber-200',
  [StatusRota.FINALIZADA]: 'bg-green-50 text-green-700 border-green-200',
  [StatusRota.PROBLEMA]: 'bg-red-50 text-red-700 border-red-200',
};

export const DriverPanel: React.FC<DriverPanelProps> = ({
  driver,
  routes,
  expenses,
  onUpdateRoute,
  onAddExpense,
  onAddRoute,
  onLogout
}) => {
  const [viewMode, setViewMode] = useState<'identification' | 'new-route' | 'dashboard'>('identification');
  const [routeNumber, setRouteNumber] = useState('');
  const [selectedPlate, setSelectedPlate] = useState('');
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [routeToFinalize, setRouteToFinalize] = useState<Rota | null>(null);
  const [finalKm, setFinalKm] = useState('');
  const [unloadingPhoto, setUnloadingPhoto] = useState<File | null>(null);
  const [unloadingPreview, setUnloadingPreview] = useState<string>('');
  const [isUploadingUnloading, setIsUploadingUnloading] = useState(false);
  const [isSobraModalOpen, setIsSobraModalOpen] = useState(false);
  const [isSobraConfirmOpen, setIsSobraConfirmOpen] = useState(false);
  const [sobraPhotos, setSobraPhotos] = useState<File[]>([]);
  const [sobraPreviews, setSobraPreviews] = useState<string[]>([]);
  const [isPernoiteConfirmModalOpen, setIsPernoiteConfirmModalOpen] = useState(false);
  const [routeToPernoite, setRouteToPernoite] = useState<Rota | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseLocation, setExpenseLocation] = useState('');

  // New Route Form State
  const [newRouteCity, setNewRouteCity] = useState('');
  const [newRouteDate, setNewRouteDate] = useState(new Date().toISOString().split('T')[0]);
  const [newRouteKm, setNewRouteKm] = useState('');

  const [activeTab, setActiveTab] = useState<'routes' | 'expenses'>('routes');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Expenses Form State
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseType, setExpenseType] = useState<TipoDespesa>(TipoDespesa.COMBUSTIVEL);
  const [expenseNotes, setExpenseNotes] = useState('');
  const [receiptPhoto, setReceiptPhoto] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  // Buscar veículos do Supabase
  useEffect(() => {
    const buscarVeiculos = async () => {
      try {
        const veiculosData = await servicoFrota.obterVeiculos();
        setVeiculos(veiculosData);
      } catch (error) {
        console.error('Erro ao buscar veículos:', error);
      }
    };
    buscarVeiculos();
  }, []);

  useEffect(() => {
    const hasActiveRoute = routes.some(r => r.driver_id === driver.id && r.status !== StatusRota.FINALIZADA);
    if (hasActiveRoute && viewMode === 'identification') {
      setViewMode('dashboard');
    }
  }, [routes, driver.id]);

  const myRoutes = routes.filter(r => r.driver_id === driver.id);
  const activeRoutes = myRoutes.filter(r => r.status !== StatusRota.FINALIZADA);
  const historyRoutes = myRoutes.filter(r => r.status === StatusRota.FINALIZADA);
  const myExpenses = expenses.filter(e => e.motoristaId === driver.id && e.tipo !== TipoDespesa.PERNOITE_ADMIN);

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouteId) {
      addToast("Selecione uma rota para registrar a despesa.", "warning");
      return;
    }

    if (!receiptPhoto) {
      addToast("O comprovante é obrigatório.", "warning");
      return;
    }

    try {
      setIsUploadingReceipt(true);

      const route = routes.find(r => r.id === selectedRouteId);
      const photoUrl = await uploadReceipt(receiptPhoto);

      onAddExpense({
        rotaId: selectedRouteId,
        motoristaId: driver.id,
        tipo: expenseType,
        valor: parseFloat(expenseAmount),
        date: route ? route.date : new Date().toISOString().split('T')[0],
        observacoes: expenseLocation ? `Local: ${expenseLocation}${expenseNotes ? ' - ' + expenseNotes : ''}` : expenseNotes,
        img_url: photoUrl
      });

      // Reset form
      setExpenseAmount('');
      setExpenseNotes('');
      setExpenseLocation('');
      setReceiptPhoto(null);
      setReceiptPreview('');
      setIsExpenseModalOpen(false);
      addToast("Despesa registrada com sucesso!", "success");
    } catch (error) {
      console.error('Error submitting expense:', error);
      addToast("Erro ao enviar comprovante. Tente novamente.", "error");
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    handlePhotoChange(e);
  };

  const handleStartRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (routeNumber && selectedPlate) {
      const existingRoute = routes.find(r => r.id === routeNumber || r.route_number === routeNumber);
      if (existingRoute) {
        setViewMode('dashboard');
      } else {
        setViewMode('new-route');
      }
    } else {
      addToast("Por favor, preencha o número da rota e a placa do veículo.", "warning");
    }
  };

  const handleCreateRoute = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedVehicle = veiculos.find(v => v.plate === selectedPlate);

    onAddRoute({
      driver_id: driver.id,
      vehicle_id: selectedVehicle?.id,
      route_number: routeNumber,
      origin: 'Seara - Bebedouro, SP', // Updated default origin as per request
      destination: newRouteCity,
      date: newRouteDate,
      status: StatusRota.EM_ANDAMENTO,
      cargo_type: 'Seara', // Default
      estimated_revenue: 0, // Default
      initial_km: parseFloat(newRouteKm)
    });
    addToast("Nova rota iniciada com sucesso!", "success");
    setViewMode('dashboard');
  };

  const openFinalizeModal = (route: Rota) => {
    setRouteToFinalize(route);
    setFinalKm('');
    setIsFinalizeModalOpen(true);
  };

  const openPernoiteModal = (route: Rota) => {
    setRouteToPernoite(route);
    setIsPernoiteConfirmModalOpen(true);
  };

  const handlePernoiteConfirm = () => {
    if (!routeToPernoite) return;

    // Update route status to PERNOITE
    onUpdateRoute(routeToPernoite.id, { status: StatusRota.PERNOITE });

    addToast('Modo Pernoite ativado!', 'success');
    setIsPernoiteConfirmModalOpen(false);
    setRouteToPernoite(null);
  };

  const handleFinalizeconfirm = async () => {
    if (!routeToFinalize || !finalKm) {
      addToast('Informe o KM final', 'warning');
      return;
    }

    if (!unloadingPhoto) {
      addToast('A foto da descarga é obrigatória', 'warning');
      return;
    }

    const kmFinal = parseFloat(finalKm);
    if (kmFinal < routeToFinalize.initial_km) {
      addToast('KM final não pode ser menor que o inicial', 'error');
      return;
    }

    try {
      setIsUploadingUnloading(true);

      // Upload unloading photo
      const unloadingUrl = await uploadReceipt(unloadingPhoto, routeToFinalize.id);

      // After unloading photo, ask about sobra
      setIsFinalizeModalOpen(false);
      setIsSobraConfirmOpen(true);

    } catch (error) {
      console.error('Error in finalization step:', error);
      addToast('Erro ao processar finalização', 'error');
    } finally {
      setIsUploadingUnloading(false);
    }
  };

  const handleSobraNo = async () => {
    if (!routeToFinalize || !finalKm) return;

    try {
      setIsUploadingUnloading(true);

      const unloadingUrl = await uploadReceipt(unloadingPhoto!, routeToFinalize.id);

      const kmFinal = parseFloat(finalKm);
      let dailyRate = 0;
      let kmRate = 0;

      const vehicle = veiculos.find(v => v.id === routeToFinalize.vehicle_id);
      if (vehicle) {
        dailyRate = vehicle.daily_rate;
        kmRate = vehicle.km_rate;
      }

      const distance = kmFinal - routeToFinalize.initial_km;
      const revenue = dailyRate + (distance * kmRate);

      onUpdateRoute(routeToFinalize.id, {
        status: StatusRota.FINALIZADA,
        final_km: kmFinal,
        estimated_revenue: revenue,
        unloading_photo_url: unloadingUrl
      });

      addToast('Rota finalizada com sucesso!', 'success');
      setIsSobraConfirmOpen(false);
      setRouteToFinalize(null);
      setFinalKm('');
      setUnloadingPhoto(null);
      setUnloadingPreview('');
      setViewMode('identification');
      setRouteNumber('');
      setSelectedPlate('');
    } catch (error) {
      console.error('Error finalizing route:', error);
      addToast('Erro ao finalizar rota', 'error');
    } finally {
      setIsUploadingUnloading(false);
    }
  };

  const handleSobraSaveAndFinalize = async () => {
    if (!routeToFinalize || !finalKm || sobraPhotos.length === 0) return;

    try {
      setIsUploadingUnloading(true);

      const unloadingUrl = await uploadReceipt(unloadingPhoto!, routeToFinalize.id);

      const kmFinal = parseFloat(finalKm);
      let dailyRate = 0;
      let kmRate = 0;

      const vehicle = veiculos.find(v => v.id === routeToFinalize.vehicle_id);
      if (vehicle) {
        dailyRate = vehicle.daily_rate;
        kmRate = vehicle.km_rate;
      }

      const distance = kmFinal - routeToFinalize.initial_km;
      const revenue = dailyRate + (distance * kmRate);

      // Upload all sobra photos
      const uploadPromises = sobraPhotos.map((photo, index) =>
        uploadReceipt(photo, `sobra_${routeToFinalize.id}_${index + 1}`)
      );
      const sobraUrls = await Promise.all(uploadPromises);
      const joinedSobraUrls = sobraUrls.join(',');

      onUpdateRoute(routeToFinalize.id, {
        status: StatusRota.FINALIZADA,
        final_km: kmFinal,
        estimated_revenue: revenue,
        unloading_photo_url: unloadingUrl,
        leftover_photo_url: joinedSobraUrls
      });

      addToast('Rota finalizada com sobra registrada!', 'success');
      setIsSobraModalOpen(false);
      setRouteToFinalize(null);
      setFinalKm('');
      setUnloadingPhoto(null);
      setUnloadingPreview('');
      setSobraPhotos([]);
      setSobraPreviews([]);
      setViewMode('identification');
      setRouteNumber('');
      setSelectedPlate('');
    } catch (error) {
      console.error('Error saving sobra and finalizing:', error);
      addToast('Erro ao salvar sobra', 'error');
    } finally {
      setIsUploadingUnloading(false);
    }
  };

  const handleSobraPhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setSobraPhotos(prev => [...prev, ...files]);

    // Generate previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSobraPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveSobraPhoto = (index: number) => {
    setSobraPhotos(prev => prev.filter((_, i) => i !== index));
    setSobraPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUnloadingPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUnloadingPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUnloadingPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  if (viewMode === 'identification') {
    return (
      <div className="min-h-screen bg-[#0A192F] flex items-center justify-center p-6 pb-24 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D32F2F]/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]"></div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-white/20">
          <div className="p-10">
            <div className="flex flex-col items-center text-center mb-10">
              <div className="w-20 h-20 bg-[#D32F2F] rounded-[2rem] flex items-center justify-center shadow-lg shadow-red-200 mb-6">
                <Truck className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Identificação</h1>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2">ALC Logística • Painel do Motorista</p>
            </div>

            <form onSubmit={handleStartRoute} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">NÚMERO DA ROTA</label>
                  <input
                    type="text"
                    required
                    value={routeNumber}
                    onChange={(e) => setRouteNumber(e.target.value)}
                    className="block w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-bold placeholder-gray-300 focus:ring-4 focus:ring-[#D32F2F]/5 focus:border-[#D32F2F]/20 transition-all outline-none"
                    placeholder="Ex: 884321"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Motorista</label>
                  <div className="flex items-center gap-4 px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl">
                    <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-sm font-black text-white shadow-sm">
                      {driver.nome.charAt(0)}
                    </div>
                    <div>
                      <span className="block text-sm font-black text-gray-900 uppercase tracking-tight">{driver.nome}</span>
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Acesso Autorizado</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">PLACA DO VEÍCULO</label>
                  <div className="relative">
                    <select
                      required
                      value={selectedPlate}
                      onChange={(e) => setSelectedPlate(e.target.value)}
                      className="block w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-bold focus:ring-4 focus:ring-[#D32F2F]/5 focus:border-[#D32F2F]/20 transition-all outline-none appearance-none"
                    >
                      <option value="">Selecione a placa...</option>
                      {veiculos.map((v) => (
                        <option key={v.plate} value={v.plate}>
                          {v.plate} - {v.model}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-5 px-6 bg-[#D32F2F] hover:bg-[#b71c1c] text-white rounded-2xl shadow-xl shadow-red-100 hover:shadow-2xl hover:shadow-red-200 transition-all duration-300 font-black uppercase text-xs tracking-[0.2em] mt-4 active:scale-[0.98]"
              >
                Acessar Operação
              </button>
            </form>

            <div className="mt-12 text-center">
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">© 2026 ALC Logística V2</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'new-route') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] shadow-xl w-full max-w-lg overflow-hidden relative">
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-[#D32F2F]" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Nova Rota</h1>
              </div>
              <button onClick={() => setViewMode('identification')} className="text-sm text-gray-400 hover:text-gray-600">
                Voltar
              </button>
            </div>

            <form onSubmit={handleCreateRoute} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    CIDADE
                  </label>
                  <input
                    type="text"
                    required
                    value={newRouteCity}
                    onChange={(e) => setNewRouteCity(e.target.value)}
                    className="block w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] transition-all"
                    placeholder="Ex: Curitiba"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    DATA DE INÍCIO
                  </label>
                  <input
                    type="date"
                    required
                    value={newRouteDate}
                    onChange={(e) => setNewRouteDate(e.target.value)}
                    className="block w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  KM INICIAL
                </label>
                <input
                  type="number"
                  required
                  value={newRouteKm}
                  onChange={(e) => setNewRouteKm(e.target.value)}
                  className="block w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] transition-all"
                  placeholder="Ex: 15430"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 px-4 bg-[#D32F2F] hover:bg-[#b71c1c] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-bold text-lg mt-8"
              >
                Iniciar Viagem
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-400">© 2026 ALC. Todos os direitos reservados.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0 relative">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {/* Header Mobile/Desktop */}
      <header className="bg-[#0A192F] text-white p-5 sticky top-0 z-10 shadow-lg border-b border-white/5">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#D32F2F] rounded-full flex items-center justify-center text-xl font-black shadow-inner">
              {driver.nome ? driver.nome.substring(0, 2).toUpperCase() : 'AD'}
            </div>
            <div>
              <h2 className="font-bold text-base md:text-lg tracking-tight">{driver.nome}</h2>
              <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                <Truck className="w-3 h-3 text-[#D32F2F]" />
                <span>{driver.modeloVeiculo || 'FROTA'} • {selectedPlate || driver.placa}</span>
              </div>
            </div>
          </div>
          <button onClick={onLogout} className="p-2.5 hover:bg-white/10 rounded-xl transition-all border border-white/10 shadow-sm" title="Sair">
            <LogOut className="w-5 h-5 opacity-80" />
          </button>
        </div>
      </header>

      {/* Mobile Tab Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 flex md:hidden z-20 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <button
          onClick={() => setActiveTab('routes')}
          className={`flex-1 p-4 flex flex-col items-center justify-center transition-all ${activeTab === 'routes' ? 'text-gray-900 scale-110' : 'text-gray-300'}`}
        >
          <div className={`p-1 rounded-xl ${activeTab === 'routes' ? 'bg-gray-100' : ''}`}>
            <Truck className={`w-6 h-6 ${activeTab === 'routes' ? 'text-[#D32F2F]' : ''}`} />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest mt-1 ${activeTab === 'routes' ? 'opacity-100' : 'opacity-0'}`}>Rotas</span>
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 p-4 flex flex-col items-center justify-center transition-all ${activeTab === 'expenses' ? 'text-gray-900 scale-110' : 'text-gray-300'}`}
        >
          <div className={`p-1 rounded-xl ${activeTab === 'expenses' ? 'bg-gray-100' : ''}`}>
            <Receipt className={`w-6 h-6 ${activeTab === 'expenses' ? 'text-[#D32F2F]' : ''}`} />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest mt-1 ${activeTab === 'expenses' ? 'opacity-100' : 'opacity-0'}`}>Despesas</span>
        </button>
      </div>

      <main className="max-w-4xl mx-auto p-4">

        {/* ROUTES TAB */}
        {activeTab === 'routes' && (
          <div className="space-y-8">
            {/* Active Routes Section */}
            <div>
              {/* Active Routes Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] transition-colors duration-500 ${activeRoutes.some(r => r.status === StatusRota.PERNOITE) ? 'bg-[#F1B50E] shadow-[#F1B50E]/40' : 'bg-[#10B981] shadow-[#10B981]/40'}`}></div>
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight">Viagem Atual</h3>
                </div>

                {activeRoutes.length === 0 ? (
                  <div className="bg-white rounded-[2rem] p-16 text-center border border-gray-100 shadow-sm shadow-gray-100/50">
                    <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <History className="w-10 h-10 text-gray-200" />
                    </div>
                    <p className="text-gray-400 font-bold text-sm">Nenhuma viagem em andamento.</p>
                    <p className="text-[10px] font-medium text-gray-300 uppercase tracking-widest mt-2">Os dados aparecerão aqui quando você iniciar uma rota.</p>
                  </div>
                ) : (
                  activeRoutes.map(route => {
                    const statusLabel = route.status === StatusRota.EM_ANDAMENTO ? 'EM ANDAMENTO' :
                      route.status === StatusRota.PERNOITE ? 'EM PERNOITE' :
                        route.status.toUpperCase();
                    const isPernoite = route.status === StatusRota.PERNOITE;
                    const accentColor = isPernoite ? '#F1B50E' : '#D32F2F';

                    return (
                      <div key={route.id} className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden relative group transition-all hover:shadow-2xl hover:shadow-gray-200/60 animate-in slide-in-from-bottom-4 duration-500" style={{ borderTop: `4px solid ${accentColor}` }}>
                        <div className="p-8">
                          <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-3">
                              <div className="w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.5)]" style={{ backgroundColor: accentColor }}></div>
                              <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: accentColor }}>{statusLabel}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300 font-bold text-[10px] uppercase tracking-widest">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(route.date).toLocaleDateString('pt-BR')}
                            </div>
                          </div>

                          {/* Route Path Visualization */}
                          <div className="relative mb-10 pl-2">
                            <div className="absolute left-[15px] top-6 bottom-6 w-0.5 border-l-2 border-dashed border-gray-100"></div>

                            <div className="flex items-start gap-6 mb-8 relative z-10">
                              <div className="w-8 h-8 rounded-full border-2 bg-white flex items-center justify-center flex-shrink-0 shadow-sm" style={{ borderColor: accentColor }}>
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accentColor }}></div>
                              </div>
                              <div className="pt-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Origem</p>
                                <h4 className="text-lg font-black text-gray-900 tracking-tight leading-none">{route.origin}</h4>
                              </div>
                            </div>

                            <div className="flex items-start gap-6 relative z-10">
                              <div className="w-8 h-8 rounded-full border-2 border-gray-900 bg-white flex items-center justify-center flex-shrink-0 shadow-md">
                                <MapPin className="w-4 h-4 text-gray-900" />
                              </div>
                              <div className="pt-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Destino</p>
                                <h4 className="text-lg font-black text-gray-900 tracking-tight leading-none">{route.destination}</h4>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gray-50/80 rounded-2xl p-4 flex items-center gap-4 border border-gray-100 mb-8">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                              <PlusCircle className="w-5 h-5 text-gray-300" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Tipo de Carga</p>
                              <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{route.cargo_type || 'Seara'}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-3">
                            <button
                              onClick={() => openPernoiteModal(route)}
                              className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 ${isPernoite ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-white hover:border-gray-200 hover:text-gray-900'}`}
                            >
                              <Moon className="w-5 h-5 mb-2" />
                              <span className="text-[9px] font-black uppercase tracking-widest">Pernoite</span>
                            </button>
                            <button className="flex flex-col items-center justify-center p-4 bg-red-50 border border-red-50 text-red-400 rounded-2xl hover:bg-white hover:border-red-100 transition-all active:scale-95">
                              <AlertTriangle className="w-5 h-5 mb-2" />
                              <span className="text-[9px] font-black uppercase tracking-widest">Problema</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRouteId(route.id);
                                setIsExpenseModalOpen(true);
                              }}
                              className="flex flex-col items-center justify-center p-4 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-95"
                            >
                              <Plus className="w-5 h-5 mb-2" />
                              <span className="text-[9px] font-black uppercase tracking-widest">Despesa</span>
                            </button>
                            <button
                              onClick={() => openFinalizeModal(route)}
                              className="flex flex-col items-center justify-center p-4 bg-[#10B981] text-white rounded-2xl hover:bg-[#059669] transition-all shadow-lg shadow-green-100 active:scale-95"
                            >
                              <CheckCircle className="w-5 h-5 mb-2" />
                              <span className="text-[9px] font-black uppercase tracking-widest">Finalizar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* History Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">Histórico de Viagens</h3>
              </div>

              <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
                {historyRoutes.length === 0 ? (
                  <p className="text-gray-400 text-sm font-medium italic">Nenhuma viagem finalizada recentemente.</p>
                ) : (
                  <div className="space-y-3">
                    {historyRoutes.map(route => (
                      <div key={route.id} className="bg-gray-50 rounded-xl border border-gray-100 p-4 transition-all hover:bg-white hover:shadow-md text-left">
                        <div className="flex justify-between items-center mb-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-green-100 text-green-700 border border-green-200 uppercase tracking-wider">
                            {route.status}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            {new Date(route.date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-900 font-black">
                          <span>{route.origin}</span>
                          <span className="mx-2 text-gray-300">➔</span>
                          <span>{route.destination}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Expenses History */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">Histórico de Despesas</h3>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {myExpenses.length === 0 ? (
                  <div className="p-10 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
                      <PlusCircle className="w-8 h-8 text-gray-200" />
                    </div>
                    <p className="text-gray-400 text-sm font-medium">Nenhuma despesa registrada nesta viagem.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {myExpenses.map(exp => (
                      <div key={exp.id} className="p-5 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-black text-gray-900 text-sm uppercase tracking-tight">{exp.tipo}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                              {new Date(exp.date).toLocaleDateString('pt-BR')} • {exp.observacoes || 'Sem observações'}
                            </p>
                          </div>
                          <span className="font-black text-gray-900 ml-4">
                            R$ {exp.valor.toFixed(2)}
                          </span>
                        </div>
                        {exp.img_url && (
                          <button
                            onClick={() => window.open(exp.img_url, '_blank')}
                            className="mt-2 text-[10px] font-black text-[#D32F2F] uppercase tracking-widest flex items-center gap-1.5 border border-red-100 bg-red-50/50 px-2 py-1 rounded-md"
                          >
                            <Camera className="w-3 h-3" /> Ver Comprovante
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="p-5 bg-[#F8FAFC] flex justify-between items-center border-t border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Acumulado</span>
                      <span className="font-black text-[#D32F2F] text-xl">
                        R$ {myExpenses.reduce((acc, curr) => acc + curr.valor, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* EXPENSES TAB */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center">
                  <PlusCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Nova Despesa</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Preencha os valores e anexe a foto</p>
                </div>
              </div>

              <form onSubmit={handleExpenseSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Rota Relacionada</label>
                  <select
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-sm text-gray-900 focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900/10 outline-none transition-all appearance-none"
                  >
                    <option value="">Selecione a rota...</option>
                    {myRoutes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.origin} ➔ {r.destination} ({new Date(r.date).toLocaleDateString('pt-BR')})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Categoria</label>
                    <select
                      value={expenseType}
                      onChange={(e) => setExpenseType(e.target.value as TipoDespesa)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-sm text-gray-900 focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900/10 outline-none transition-all appearance-none"
                    >
                      {Object.values(TipoDespesa).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-sm text-gray-900 focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900/10 outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Observações</label>
                  <input
                    type="text"
                    value={expenseNotes}
                    onChange={(e) => setExpenseNotes(e.target.value)}
                    placeholder="Ex: Almoço, Pedágio..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-sm text-gray-900 focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900/10 outline-none transition-all"
                  />
                </div>

                {/* Receipt Photo Upload */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Foto do Comprovante</label>
                  <div className="space-y-3">
                    {receiptPreview ? (
                      <div className="relative group">
                        <img
                          src={receiptPreview}
                          alt="Nota fiscal"
                          className="w-full h-56 object-cover rounded-2xl border-2 border-gray-100 shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptPhoto(null);
                            setReceiptPreview('');
                          }}
                          className="absolute top-3 right-3 bg-red-600 text-white p-2.5 rounded-full hover:bg-red-700 transition-all shadow-lg active:scale-95"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <label className="cursor-pointer group">
                          <div className="border-2 border-dashed border-gray-100 bg-gray-50/50 rounded-2xl p-6 hover:border-gray-900/20 hover:bg-gray-100/30 transition-all text-center">
                            <Receipt className="w-8 h-8 mx-auto text-gray-300 mb-2 group-hover:text-gray-900 transition-colors" />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight group-hover:text-gray-900">Arquivo</p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                          />
                        </label>
                        <label className="cursor-pointer group">
                          <div className="border-2 border-dashed border-gray-100 bg-gray-50/50 rounded-2xl p-6 hover:border-gray-900/20 hover:bg-gray-100/30 transition-all text-center">
                            <Camera className="w-8 h-8 mx-auto text-gray-300 mb-2 group-hover:text-gray-900 transition-colors" />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight group-hover:text-gray-900">Câmera</p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleCameraCapture}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUploadingReceipt}
                  className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {isUploadingReceipt ? 'Enviando...' : 'Registrar Despesa'}
                </button>
              </form>
            </div>

            {/* Expenses History */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">Histórico de Gastos</h3>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {myExpenses.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">Nenhum gasto registrado.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {myExpenses.map(exp => (
                      <div key={exp.id} className="p-4 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">{exp.tipo}</p>
                          <p className="text-xs text-gray-500">{new Date(exp.date).toLocaleDateString('pt-BR')} • {exp.observacoes || 'Sem observações'}</p>
                        </div>
                        <span className="font-bold text-gray-900">
                          R$ {exp.valor.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="p-4 bg-gray-50 flex justify-between items-center">
                      <span className="font-semibold text-gray-700">Total</span>
                      <span className="font-bold text-brand-700 text-lg">
                        R$ {myExpenses.reduce((acc, curr) => acc + curr.valor, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-[#0A192F]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all animate-in fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Nova Despesa</h2>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit}>
              <div className="p-8 space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tipo de Despesa</label>
                  <div className="relative">
                    <select
                      value={expenseType}
                      onChange={(e) => setExpenseType(e.target.value as TipoDespesa)}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900/10 outline-none font-bold text-gray-900 appearance-none transition-all"
                    >
                      {Object.values(TipoDespesa).map(tipo => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <Receipt className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Valor (R$)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900/10 outline-none font-bold text-gray-900 transition-all font-mono"
                      placeholder="0,00"
                    />
                    <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Local</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={expenseLocation}
                      onChange={(e) => setExpenseLocation(e.target.value)}
                      className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900/10 outline-none font-bold text-gray-900 transition-all font-mono"
                      placeholder="Ex: Posto Graal"
                    />
                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Comprovante</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-200 border-dashed rounded-2xl appearance-none cursor-pointer hover:border-gray-300 focus:outline-none relative overflow-hidden group">
                    {receiptPreview ? (
                      <img src={receiptPreview} alt="Comprovante" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-40 transition-opacity" />
                    ) : (
                      <div className="flex flex-col items-center space-y-2">
                        <Camera className="w-8 h-8 text-gray-300 group-hover:text-gray-400 transition-colors" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Adicionar Comprovante</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="p-8 bg-gray-50/50">
                <button
                  type="submit"
                  disabled={isUploadingReceipt}
                  className="w-full py-5 bg-gray-900 text-white rounded-2xl hover:bg-black font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-gray-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isUploadingReceipt ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Salvar Despesa
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pernoite Confirmation Modal */}
      {isPernoiteConfirmModalOpen && (
        <div className="fixed inset-0 bg-[#0A192F]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all animate-in fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Moon className="w-6 h-6 text-amber-500" />
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Confirmar Pernoite?</h2>
            </div>

            <div className="p-8">
              <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 flex items-start gap-4 mb-8">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Moon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-900 uppercase tracking-tight">Iniciar Pernoite</h3>
                  <p className="text-xs font-bold text-amber-700/70 mt-1 leading-relaxed">
                    O status da viagem será alterado para descanso. Confirme se você está parando o veículo.
                  </p>
                </div>
              </div>

              <p className="text-sm font-bold text-gray-500 leading-relaxed px-2">
                Deseja confirmar a alteração do status da rota para <span className="text-gray-900">Pernoite</span>?
              </p>
            </div>

            <div className="p-8 bg-gray-50/50 flex gap-3">
              <button
                onClick={() => setIsPernoiteConfirmModalOpen(false)}
                className="flex-1 px-6 py-4 border border-gray-200 text-gray-500 rounded-2xl hover:bg-white hover:text-gray-900 font-black uppercase text-[10px] tracking-widest transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handlePernoiteConfirm}
                className="flex-[2] px-6 py-4 bg-amber-500 text-white rounded-2xl hover:bg-amber-600 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-100 transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conferência de Sobra Modal */}
      {isSobraConfirmOpen && (
        <div className="fixed inset-0 bg-[#0A192F]/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-all animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 flex justify-end">
              <button onClick={() => setIsSobraConfirmOpen(false)} className="text-gray-300 hover:text-gray-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="px-8 pb-12 text-center">
              <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center">
                  <Truck className="w-8 h-8 text-orange-500" />
                </div>
              </div>

              <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-4">Tem sobra de mercadoria?</h2>
              <p className="text-sm font-bold text-gray-400 leading-relaxed mb-10 px-4">
                Verifique se restou algum volume no veículo que não foi entregue.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSobraNo}
                  className="w-full py-4 bg-gray-50 text-gray-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-100 transition-all"
                >
                  Não
                </button>
                <button
                  onClick={() => {
                    setIsSobraConfirmOpen(false);
                    setIsSobraModalOpen(true);
                  }}
                  className="w-full py-4 bg-[#1A1A1A] text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-lg shadow-gray-200"
                >
                  Sim, tem sobra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registrar Sobra Modal */}
      {isSobraModalOpen && (
        <div className="fixed inset-0 bg-[#0A192F]/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-all animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                  <Truck className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Registrar Sobra</h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fotos da Mercadoria</p>
                </div>
              </div>
              <button onClick={() => setIsSobraModalOpen(false)} className="text-gray-300 hover:text-gray-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8">
              <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100/50 mb-8">
                <p className="text-xs font-bold text-orange-800 leading-relaxed">
                  Por favor, tire fotos visíveis da mercadoria que sobrou e da etiqueta se houver.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="aspect-square rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-orange-500/30 hover:bg-orange-50/20 transition-all group overflow-hidden relative">
                  {sobraPreviews[0] ? (
                    <img src={sobraPreviews[0]} alt="Sobra" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <>
                      <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                        <Camera className="w-5 h-5 text-gray-400 group-hover:text-orange-600" />
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Adicionar Foto</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSobraPhotos([file]);
                      const reader = new FileReader();
                      reader.onloadend = () => setSobraPreviews([reader.result as string]);
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
                <div className="aspect-square rounded-3xl bg-gray-50 flex items-center justify-center border-2 border-transparent">
                  <Truck className="w-8 h-8 text-gray-100" />
                </div>
              </div>
            </div>

            <div className="p-8 bg-gray-50/50">
              <button
                disabled={sobraPhotos.length === 0 || isUploadingUnloading}
                onClick={handleSobraSaveAndFinalize}
                className="w-full py-5 bg-[#00A859] text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#008f4c] disabled:opacity-50 transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-3"
              >
                {isUploadingUnloading ? <RefreshCw className="animate-spin w-5 h-5" /> : 'Salvar e Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Modal */}
      {isFinalizeModalOpen && (
        <div className="fixed inset-0 bg-[#0A192F]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all animate-in fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Finalizar Rota</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Km Final e Comprovante</p>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">KM Final</label>
                <input
                  type="number"
                  step="0.01"
                  value={finalKm}
                  onChange={(e) => setFinalKm(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 outline-none font-bold text-gray-900 transition-all font-mono"
                  placeholder="0.00"
                />
              </div>

              {/* Unloading Photo Upload */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Foto da Descarga</label>
                <div className="space-y-3">
                  {unloadingPreview ? (
                    <div className="relative group">
                      <img
                        src={unloadingPreview}
                        alt="Descarga"
                        className="w-full h-56 object-cover rounded-2xl border-2 border-gray-100 shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setUnloadingPhoto(null);
                          setUnloadingPreview('');
                        }}
                        className="absolute top-3 right-3 bg-red-600 text-white p-2.5 rounded-full hover:bg-red-700 transition-all shadow-lg active:scale-95"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="cursor-pointer group">
                        <div className="border-2 border-dashed border-gray-100 bg-gray-50/50 rounded-2xl p-6 hover:border-emerald-500/50 hover:bg-emerald-50/30 transition-all text-center">
                          <Receipt className="w-8 h-8 mx-auto text-gray-300 mb-2 group-hover:text-emerald-500 transition-colors" />
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight group-hover:text-emerald-600">Arquivo</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUnloadingPhotoChange}
                          className="hidden"
                        />
                      </label>
                      <label className="cursor-pointer group">
                        <div className="border-2 border-dashed border-gray-100 bg-gray-50/50 rounded-2xl p-6 hover:border-emerald-500/50 hover:bg-emerald-50/30 transition-all text-center">
                          <Camera className="w-8 h-8 mx-auto text-gray-300 mb-2 group-hover:text-emerald-500 transition-colors" />
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight group-hover:text-emerald-600">Câmera</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleUnloadingPhotoChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-8 bg-gray-50/50 flex gap-3">
              <button
                onClick={() => {
                  setIsFinalizeModalOpen(false);
                  setFinalKm('');
                  setUnloadingPhoto(null);
                  setUnloadingPreview('');
                }}
                className="flex-1 px-6 py-4 border border-gray-200 text-gray-500 rounded-2xl hover:bg-white hover:text-gray-900 font-black uppercase text-[10px] tracking-widest transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalizeconfirm}
                disabled={isUploadingUnloading}
                className="flex-[2] px-6 py-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-100 transition-all disabled:opacity-50"
              >
                {isUploadingUnloading ? 'Finalizando...' : 'Confirmar Entrega'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sobra Confirmation Modal */}
      {isSobraConfirmOpen && (
        <div className="fixed inset-0 bg-[#0A192F]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all animate-in fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-4">
              <div className="flex items-center justify-center mb-6">
                <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center shadow-inner">
                  <TrendingUp className="w-10 h-10 text-blue-600" />
                </div>
              </div>
              <h2 className="text-2xl font-black text-gray-900 text-center tracking-tight mb-2">Teve sobra?</h2>
              <p className="text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest leading-loose">
                Se houver caixas de devolução,<br />registre as fotos agora
              </p>
            </div>
            <div className="p-8 flex gap-3">
              <button
                onClick={() => setIsSobraConfirmOpen(false)}
                className="flex-1 px-4 py-4 border border-gray-200 text-gray-500 rounded-2xl hover:bg-gray-50 font-black uppercase text-[10px] tracking-widest transition-all"
              >
                Não
              </button>
              <button
                onClick={() => {
                  setIsSobraConfirmOpen(false);
                  setIsSobraModalOpen(true);
                }}
                className="flex-[2] px-4 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-100 transition-all"
              >
                Sim, Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registrar Sobra Modal (Multi-photo & Camera Support) */}
      {isSobraModalOpen && (
        <div className="fixed inset-0 bg-[#0A192F]/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-all animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                  <Truck className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Registrar Sobra</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Fotos da mercadoria</p>
                </div>
              </div>
              <button
                onClick={() => setIsSobraModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="bg-orange-50/50 rounded-2xl p-6 border border-orange-100">
                <p className="text-sm font-bold text-orange-900 leading-relaxed">
                  Por favor, tire fotos visíveis da mercadoria que sobrou e da etiqueta se houver.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Existing Previews */}
                {sobraPreviews.map((preview, index) => (
                  <div key={index} className="aspect-square rounded-3xl overflow-hidden relative group border border-gray-100 shadow-sm animate-in zoom-in duration-300">
                    <img src={preview} alt={`Sobra ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleRemoveSobraPhoto(index)}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Add New Photo Slots (Camera & Gallery) */}
                <div className="grid grid-cols-1 gap-3">
                  <label className="aspect-[2/1] rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-blue-500/30 hover:bg-blue-50/20 transition-all group overflow-hidden">
                    <Camera className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-blue-600">Câmera</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleSobraPhotosChange} />
                  </label>
                  <label className="aspect-[2/1] rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-blue-500/30 hover:bg-blue-50/20 transition-all group overflow-hidden">
                    <Receipt className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-blue-600">Galeria</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleSobraPhotosChange} />
                  </label>
                </div>

                {sobraPreviews.length === 0 && (
                  <div className="aspect-square rounded-3xl bg-gray-50 flex items-center justify-center border-2 border-dashed border-gray-100">
                    <Truck className="w-10 h-10 text-gray-100" />
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-gray-50/50">
              <button
                disabled={sobraPhotos.length === 0 || isUploadingUnloading}
                onClick={handleSobraSaveAndFinalize}
                className="w-full py-5 bg-[#00A859] text-white rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-[#008f4c] disabled:opacity-50 transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-3"
              >
                {isUploadingUnloading ? <RefreshCw className="animate-spin w-5 h-5" /> : 'Salvar e Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};