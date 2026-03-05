// Developer: Adrian Luciano De Sena Ribeiro - MG | Tel: 31 995347802
import React, { useState, useEffect, useRef } from 'react';
import {
  Rota,
  Despesa,
  Motorista,
  StatusRota,
  EstatisticasPainel,
  TipoDespesa,
  SolicitacaoPagamento,
  StatusSolicitacao,
  TipoUsuario,
  VehicleDailyStatus,
  Usuario,
  FinancialClosure,
  Veiculo
} from '../types';
import {
  LayoutDashboard, Map, Users, Wallet, LogOut,
  Plus, Search, Filter, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle2, Factory, Truck, FileText, Moon, Edit2,
  Download, Upload, RefreshCw, BarChart3, Trash2, Calendar, Activity, ChevronLeft, ChevronRight, DollarSign,
  X, ExternalLink, Camera, Paperclip, Save, Receipt, Shield, XCircle, Loader2
} from 'lucide-react';
import { API_URL } from '../constants';
import { uploadReceipt } from '../lib/uploadReceipt';
import { servicoFrota } from '../services/fleetService';
import { servicoFinanceiro } from '../services/financialService';
import { servicoRotas } from '../services/routeService';
import { DriversView } from './DriversView';
import { Toast, ToastContainer, ToastType } from './Toast';

import { ClosureTable, MergedClosureRow } from './ClosureTable';
import { ClosureData, spreadsheetService, RouteImportData } from '../services/spreadsheetService';
import { ticketLogService } from '../services/ticketLogService';
import { ManagerialDashboard } from './ManagerialDashboard';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';


interface AdminPanelProps {
  routes: Rota[];
  drivers: Motorista[];
  shunters: Usuario[];
  expenses: Despesa[];
  veiculos: Veiculo[];
  solicitacoes: SolicitacaoPagamento[];
  onAddRoute: (route: Omit<Rota, 'id'>) => void;
  onAddDriver: (driver: Omit<Motorista, 'id'>) => void;
  onAddShunter: (shunter: { name: string, email: string, password?: string }) => void;
  onDeleteDriver: (id: string) => void;
  onDeleteShunter: (id: string) => void;
  onLogout: () => void;
  onRefresh?: () => void;
}

const COLORS = ['#3b82f6', '#fbbf24', '#ef4444', '#10b981', '#8b5cf6'];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  routes,
  drivers,
  shunters,
  expenses,
  veiculos,
  solicitacoes,
  onAddRoute,
  onAddDriver,
  onAddShunter,
  onDeleteDriver,
  onDeleteShunter,
  onLogout,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'routes' | 'financial' | 'users' | 'fleet' | 'requests' | 'rates' | 'managerial'>('dashboard');
  const [usersTab, setUsersTab] = useState<'drivers' | 'shunters'>('drivers');
  const [financialView, setFinancialView] = useState<'current' | 'history' | 'detail' | 'pernoites'>('current');
  const [fleetView, setFleetView] = useState<'grid' | 'report'>('grid');
  const [selectedFleetDate, setSelectedFleetDate] = useState(new Date());
  const [activeRequestTab, setActiveRequestTab] = useState<StatusSolicitacao>(StatusSolicitacao.AGUARDANDO);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Veiculo | null>(null);

  // Financial Closure State
  const [closureHistory, setClosureHistory] = useState<FinancialClosure[]>([]);
  const [selectedClosure, setSelectedClosure] = useState<FinancialClosure | null>(null);

  // Admin Pernoite Expense State
  const [isPernoiteAdminModalOpen, setIsPernoiteAdminModalOpen] = useState(false);
  const [routeForPernoiteExpense, setRouteForPernoiteExpense] = useState<Rota | null>(null);
  const [pernoiteAdminHotel, setPernoiteAdminHotel] = useState('');
  const [pernoiteAdminCost, setPernoiteAdminCost] = useState('');
  const [pernoiteAdminReceipt, setPernoiteAdminReceipt] = useState<File | null>(null);
  const [pernoiteAdminReceiptPreview, setPernoiteAdminReceiptPreview] = useState('');
  const [isSavingPernoiteExpense, setIsSavingPernoiteExpense] = useState(false);

  const handleUpdateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;

    try {
      await servicoFrota.atualizarVeiculo(editingVehicle.id, {
        daily_rate: editingVehicle.daily_rate,
        km_rate: editingVehicle.km_rate
      });

      // Notify parent to refresh if possible, otherwise we rely on polling
      if (onRefresh) onRefresh();

      setIsVehicleModalOpen(false);
      setEditingVehicle(null);
      addToast('Ve�culo atualizado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar ve�culo:', error);
      addToast('Erro ao atualizar ve�culo', 'error');
    }
  };

  const openVehicleEditModal = (vehicle: Veiculo) => {
    setEditingVehicle(vehicle);
    setIsVehicleModalOpen(true);
  };

  const [paymentRequests, setPaymentRequests] = useState<SolicitacaoPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRequest, setNewRequest] = useState<Partial<SolicitacaoPagamento>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isSyncingTicketLog, setIsSyncingTicketLog] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentModalTab, setPaymentModalTab] = useState<'request' | 'expense'>('request');
  const [newManualExpense, setNewManualExpense] = useState<Partial<Despesa>>({ date: new Date().toISOString().split('T')[0] });
  const [manualExpenseReceipt, setManualExpenseReceipt] = useState<File | null>(null);

  const [editingPayment, setEditingPayment] = useState<SolicitacaoPagamento | null>(null);

  const handleDeletePayment = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro de pagamento?')) return;

    try {
      await servicoFinanceiro.deletarSolicitacaoPagamento(id);
      addToast('Pagamento exclu�do com sucesso!', 'success');
      setSelectedPayment(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao excluir pagamento:', err);
      addToast('Erro ao excluir pagamento', 'error');
    }
  };

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // State para fechamento e tabelas locais
  const [closureRows, setClosureRows] = useState<MergedClosureRow[]>([]);
  const [dailyStatuses, setDailyStatuses] = useState<VehicleDailyStatus[]>([]);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<{ vehicleId: string, date: string, currentStatus?: string } | null>(null);
  const [closureDateStart, setClosureDateStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [closureDateEnd, setClosureDateEnd] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [closureStatusFilter, setClosureStatusFilter] = useState<string>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch closure history when tab changes to financial
  useEffect(() => {
    if (activeTab === 'financial') {
      servicoFinanceiro.obterFechamentos()
        .then(setClosureHistory)
        .catch(err => console.error('Failed to fetch closure history', err));
    }
  }, [activeTab]);

  // Fetch daily statuses when date or tab changes
  useEffect(() => {
    if (activeTab === 'fleet') {
      const year = selectedFleetDate.getFullYear();
      const month = String(selectedFleetDate.getMonth() + 1).padStart(2, '0');
      servicoFrota.obterStatusDiario(`${year}-${month}`)
        .then(setDailyStatuses)
        .catch(err => console.error('Failed to fetch statuses', err));
    }
  }, [activeTab, selectedFleetDate]);

  const handleCellClick = (vehicleId: string, day: number) => {
    const year = selectedFleetDate.getFullYear();
    const month = String(selectedFleetDate.getMonth() + 1).padStart(2, '0');
    const date = `${year}-${month}-${String(day).padStart(2, '0')}`;

    // Find existing status
    const existing = dailyStatuses.find(s => s.vehicle_id === vehicleId && s.date === date);

    setEditingStatus({
      vehicleId,
      date,
      currentStatus: existing?.status
    });
    setIsStatusModalOpen(true);
  };

  const handleSaveStatus = async (status: string, statusText: string) => {
    if (!editingStatus) return;

    try {
      const saved = await servicoFrota.upsertStatusDiario({
        vehicle_id: editingStatus.vehicleId,
        date: editingStatus.date,
        status,
        status_text: statusText
      });

      // Update local state
      setDailyStatuses(prev => {
        const filtered = prev.filter(s => !(s.vehicle_id === editingStatus.vehicleId && s.date === editingStatus.date));
        return [...filtered, saved as VehicleDailyStatus];
      });

      setIsStatusModalOpen(false);
      setEditingStatus(null);
      addToast('Status atualizado com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Erro ao salvar status', 'error');
    }
  };

  const handlePernoiteExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeForPernoiteExpense || !pernoiteAdminCost) return;

    try {
      setIsSavingPernoiteExpense(true);

      let receiptUrl = '';
      if (pernoiteAdminReceipt) {
        receiptUrl = await uploadReceipt(pernoiteAdminReceipt, routeForPernoiteExpense.id);
      }

      await servicoFinanceiro.criarDespesa({
        rotaId: routeForPernoiteExpense.id,
        motoristaId: routeForPernoiteExpense.driver_id,
        tipo: TipoDespesa.PERNOITE_ADMIN,
        valor: parseFloat(pernoiteAdminCost),
        date: routeForPernoiteExpense.date,
        observacoes: `Pernoite - Hotel: ${pernoiteAdminHotel}`,
        img_url: receiptUrl
      });

      addToast('Despesa de pernoite registrada!', 'success');
      setIsPernoiteAdminModalOpen(false);
      setRouteForPernoiteExpense(null);
      setPernoiteAdminHotel('');
      setPernoiteAdminCost('');
      setPernoiteAdminReceipt(null);
      setPernoiteAdminReceiptPreview('');

      // Force refresh data if callback exists
      if (onRefresh) onRefresh();

    } catch (error) {
      console.error('Error saving pernoite expense:', error);
      addToast('Erro ao salvar despesa', 'error');
    } finally {
      setIsSavingPernoiteExpense(false);
    }
  };

  const handlePernoitePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPernoiteAdminReceipt(file);
      const reader = new FileReader();
      reader.onloadend = () => setPernoiteAdminReceiptPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await spreadsheetService.parseFile(file);
      if (data.length === 0) {
        addToast('Nenhum dado v�lido encontrado.', 'error');
        return;
      }

      // Transform raw ClosureData into MergedClosureRow immediately
      const newRows: MergedClosureRow[] = data.map(item => {
        // Find route by strict match between DB route_number and Excel Identificador (Column D)
        // AND within the selected closure period
        const route = routes.find(r =>
          r.route_number &&
          String(r.route_number).trim().toLowerCase() === String(item.route_number).trim().toLowerCase() &&
          r.date >= closureDateStart &&
          r.date <= closureDateEnd
        );

        let vehicle: Veiculo | undefined;
        let km_real = 0;
        let status: MergedClosureRow['status'] = 'Ok';
        let descarga = 0;

        if (route) {
          // Find vehicle
          if (route.vehicle_id) {
            vehicle = veiculos.find(v => v.id === route.vehicle_id); // Use veiculos state here
          } else if (route.driver_id) {
            // Try to find vehicle by driver's plate if vehicle_id is missing
            const driver = drivers.find(d => d.id === route.driver_id);
            if (driver?.placa) {
              vehicle = veiculos.find(v => v.plate === driver.placa);
            }
          }

          if (route.final_km && route.initial_km) {
            km_real = route.final_km - route.initial_km;
          }

          // Calculate existing manual expenses for Descarga
          const routeExpenses = expenses.filter(e => e.rotaId === route.id);
          descarga = routeExpenses
            .filter(e => e.tipo === TipoDespesa.DESCARGA)
            .reduce((sum, e) => sum + (Number(e.valor) || 0), 0);

          if (!vehicle && route.route_number) status = 'Sem Veículo';
        } else {
          status = 'Sem Rota';
        }

        // Default KM Seara to KM Real initially
        const km_seara = km_real;

        return {
          route_number: item.route_number,
          route_id: route?.id,
          vehicle,
          payment_date: item.payment_date,
          km_real,
          km_seara,
          descarga,
          daily_rate: vehicle?.daily_rate || 0,
          val_km_seara: 0,
          val_km_perdido: 0,
          val_total_seara: item.total_gross_value,
          val_total_alc: 0,
          val_total: 0,
          status
        };
      });

      setClosureRows(newRows);
      addToast(`${data.length} rotas importadas com sucesso!`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Erro ao processar arquivo.', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSyncRavex = async () => {
    if (!selectedRoute) return;
    setIsSyncingRavex(true);
    try {
      const routeId = selectedRoute.id;
      const routeNumber = selectedRoute.route_number || routeId.split('-')[0];

      // Define a proper fallback URL if API_URL is empty ('') because it hits Vite and returns index.html
      const baseUrl = (typeof API_URL !== 'undefined' && API_URL.trim() !== '') ? API_URL : 'http://localhost:3001/api';
      const response = await fetch(`${baseUrl}/routes/ravex-cost/${routeNumber}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync with Ravex');
      }

      setRavexCosts((prev) => ({
        ...prev,
        [routeId]: {
          custoAdicional: data.custoAdicional,
          valorSolicitado: data.valorSolicitado
        }
      }));

      addToast('Dados do Ravex sincronizados com sucesso!', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Erro na sincronização: ${err.message}`, 'error');
    } finally {
      setIsSyncingRavex(false);
    }
  };

  const handleSaveRouteDetails = async () => {
    if (!selectedRoute) return;

    try {
      // Filter only DB columns to avoid 400 errors from joined fields (like 'driver' or 'drivers')
      const updateData: any = {};
      const validColumns = [
        'driver_id', 'vehicle_id', 'route_number', 'origin', 'destination',
        'date', 'status', 'cargo_type', 'estimated_revenue', 'initial_km',
        'final_km', 'km_final_seara', 'unloading_photo_url', 'leftover_photo_url', 'description',
        'final_date',
        'shunter_id', 'shunter_body_photo_url', 'shunter_boxes_photo_url',
        'shunter_verified_at'
      ];

      validColumns.forEach(col => {
        if (editedRouteData.hasOwnProperty(col)) {
          updateData[col] = (editedRouteData as any)[col];
        }
      });

      await servicoRotas.atualizarRota(selectedRoute.id, updateData);

      if (onRefresh) onRefresh();

      // Optimistic update for modal
      setSelectedRoute(prev => prev ? { ...prev, ...updateData } : null);

      setIsEditingRoute(false);
      setEditedRouteData({});
      addToast('Rota atualizada com sucesso!', 'success');
    } catch (error: any) {
      console.error('Erro ao atualizar rota:', error);
      if (error?.code === 'PGRST204' || error?.message?.includes('final_date')) {
        addToast('Coluna "final_date" não encontrada no Supabase. Execute o script SQL no implementação_plan.md', 'error');
      } else {
        addToast('Erro ao atualizar rota', 'error');
      }
    }
  };

  const handleAddExpense = async () => {
    if (!selectedRoute || !newExpense.tipo || !newExpense.valor) return;

    try {
      await servicoFinanceiro.criarDespesa({
        rotaId: selectedRoute.id,
        motoristaId: selectedRoute.driver_id || '', // Should ensure driver exists
        tipo: newExpense.tipo as TipoDespesa,
        valor: parseFloat(newExpense.valor),
        litros: newExpense.litros ? parseFloat(newExpense.litros) : undefined,
        date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
        observacoes: 'Adicionado via Painel Admin',
        img_url: ''
      });

      if (onRefresh) onRefresh();

      // We can't easily optimistic update expenses prop since it's from parent
      // But we can show success message

      setIsAddingExpense(false);
      setNewExpense({ tipo: '', valor: '', litros: '' });
      addToast('Despesa adicionada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
      addToast('Erro ao adicionar despesa', 'error');
    }
  };

  const handleUpdateExpenseTipo = async (expenseId: string, novoTipo: TipoDespesa) => {
    try {
      await servicoFinanceiro.atualizarDespesa(expenseId, { tipo: novoTipo });
      addToast('Categoria da despesa atualizada!', 'success');
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Erro ao atualizar categoria da despesa:', error);
      addToast('Erro ao atualizar categoria da despesa', 'error');
    }
  };

  // Official vehicles check moved to parent for centralization

  // Filters State (Visual mostly)
  const [dateStart, setDateStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dateEnd, setDateEnd] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [selectedDriverId, setSelectedDriverId] = useState('all');
  const [selectedPlate, setSelectedPlate] = useState('all');
  const [selectedRoute, setSelectedRoute] = useState<Rota | null>(null);

  // Ravex Sync State
  const [isSyncingRavex, setIsSyncingRavex] = useState(false);
  const [ravexCosts, setRavexCosts] = useState<Record<string, { custoAdicional: number, valorSolicitado: number }>>({});
  const [hasLoadedCachedRavex, setHasLoadedCachedRavex] = useState(false);

  // Fetch cached Ravex costs on mount
  useEffect(() => {
    const fetchCachedRavexCosts = async () => {
      try {
        const baseUrl = (typeof API_URL !== 'undefined' && API_URL.trim() !== '') ? API_URL : 'http://localhost:3001/api';
        const response = await fetch(`${baseUrl}/routes/ravex-costs/all`);
        if (response.ok) {
          const cachedMap = await response.json();
          // The API returns { routeNumber: { custoAdicional, valorSolicitado } }
          // We need to map it by route ID in the frontend state, which is tricky because the state uses routeId.
          // BUT, we can map it by route.id by iterating through active routes.

          setRavexCosts(prev => {
            const nextMap = { ...prev };
            routes.forEach(route => {
              const routeNumber = route.route_number || route.id.split('-')[0];
              if (cachedMap[routeNumber]) {
                nextMap[route.id] = cachedMap[routeNumber];
              }
            });
            return nextMap;
          });
        }
      } catch (err) {
        console.error('Failed to load cached Ravex costs:', err);
      } finally {
        setHasLoadedCachedRavex(true);
      }
    };

    if (!hasLoadedCachedRavex && routes.length > 0) {
      fetchCachedRavexCosts();
    }
  }, [hasLoadedCachedRavex, routes]);

  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [editedRouteData, setEditedRouteData] = useState<Partial<Rota>>({});
  const [newExpense, setNewExpense] = useState<{ tipo: string, valor: string, litros?: string }>({ tipo: '', valor: '', litros: '' });
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [driverSearchQuery, setDriverSearchQuery] = useState('');

  // Computed Stats
  const filteredRoutes = routes.filter(r => {
    // Filter by Driver
    if (selectedDriverId !== 'all' && r.driver_id !== selectedDriverId) return false;

    // Filter by Plate
    if (selectedPlate !== 'all') {
      const vehicle = veiculos.find(v => v.plate === selectedPlate);
      if (vehicle && r.vehicle_id !== vehicle.id) return false;
    }

    // Filter by Date
    if (dateStart && r.date < dateStart) return false;
    if (dateEnd && r.date > dateEnd) return false;

    return true;
  }).sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  // Calculate expenses related to the filtered routes
  const filteredRouteIds = new Set(filteredRoutes.map(r => r.id));
  const filteredExpenses = expenses.filter(e => filteredRouteIds.has(e.rotaId));

  // Helper to calculate revenue dynamically
  // Helper to calculate revenue dynamically (Renamed to force update)
  const getRouteRevenue = (route: Rota): number => {
    // Find vehicle
    let vehicle = null;
    if (route.vehicle_id) {
      vehicle = veiculos.find(v => v.id === route.vehicle_id);
    }

    // Fallback search by driver plate
    if (!vehicle && route.driver_id) {
      const driver = drivers.find(d => d.id === route.driver_id);
      if (driver?.placa) {
        vehicle = veiculos.find(v => v.plate === driver.placa);
      }
    }

    if (!vehicle) return 0;

    // Formula: km_final_seara * km_rate_da_placa + diaria_da_placa
    const kmFinalSeara = Number(route.km_final_seara) || 0;
    const kmRevenue = kmFinalSeara * Number(vehicle.km_rate || 0);
    return kmRevenue + Number(vehicle.daily_rate || 0);
  };

  const formattedStats = {
    rotasAtivas: filteredRoutes.filter(r => r.status === StatusRota.EM_ANDAMENTO).length,
    rotasFinalizadas: filteredRoutes.filter(r => r.status === StatusRota.FINALIZADA).length,
    rotasPernoite: filteredRoutes.filter(r => r.status === StatusRota.PERNOITE).length,
    problemas: filteredRoutes.filter(r => r.status === StatusRota.PROBLEMA).length,
    // Use the dynamic calculation
    receitaTotal: filteredRoutes.reduce((acc, r) => acc + (getRouteRevenue(r) || 0), 0),
    despesasTotal: filteredExpenses
      .filter(e => e.tipo !== TipoDespesa.DESCARGA) // Exclude reimbursable Descarga
      .reduce((sum, e) => sum + (Number(e.valor) || 0), 0),
    lucroLiquido: 0
  };
  formattedStats.lucroLiquido = formattedStats.receitaTotal - formattedStats.despesasTotal;

  // Update the stats reference used in render
  const stats = formattedStats;



  // Driver Performance Data
  const driverPerformance = drivers.map(driver => {
    const driverRoutes = filteredRoutes.filter(r => r.driver_id === driver.id);
    const driverExpenses = expenses.filter(e => e.motoristaId === driver.id);

    const revenue = driverRoutes.reduce((acc, r) => acc + (getRouteRevenue(r) || 0), 0);
    const cost = driverExpenses
      .filter(e => e.tipo !== TipoDespesa.DESCARGA) // Exclude reimbursable Descarga
      .reduce((acc, e) => acc + (Number(e.valor) || 0), 0);
    const profit = revenue - cost;

    const totalKmVal = driverRoutes.reduce((acc, r) => {
      if (r.final_km && r.initial_km) return acc + (r.final_km - r.initial_km);
      return acc;
    }, 0);

    const totalLiters = driverExpenses
      .filter(e => e.tipo === TipoDespesa.COMBUSTIVEL)
      .reduce((acc, e) => acc + (Number(e.litros) || 0), 0);

    const averageFuel = totalLiters > 0 ? (totalKmVal / totalLiters) : 0;

    return {
      id: driver.id,
      name: driver.nome,
      routesCount: driverRoutes.length,
      totalKm: `${totalKmVal.toLocaleString('pt-BR')} km`,
      averageFuel,
      revenue,
      profit
    };
  }).filter(d => d.routesCount > 0 && d.name.toLowerCase().includes(driverSearchQuery.toLowerCase()))
    .sort((a, b) => b.routesCount - a.routesCount);

  // Chart Data
  const statusData = [
    { name: 'Finalizadas', value: stats.rotasFinalizadas, color: '#3b82f6' },
    { name: 'Pernoite', value: stats.rotasPernoite, color: '#fbbf24' },
    { name: 'Em Andamento', value: stats.rotasAtivas, color: '#9ca3af' },
  ];

  // Financial Chart Data (Revenue vs Expenses - Last 6 Months)
  const financialChartData = (() => {
    const data = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = d.toISOString().slice(0, 7); // YYYY-MM
      const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();

      const monthRoutes = routes.filter(r => r.date && r.date.startsWith(monthKey));
      const revenue = monthRoutes.reduce((sum, r) => sum + (getRouteRevenue(r) || 0), 0);

      const monthRouteIds = new Set(monthRoutes.map(r => r.id));
      const expense = expenses
        .filter(e => monthRouteIds.has(e.rotaId))
        .reduce((sum, e) => sum + (Number(e.valor) || 0), 0);

      data.push({ name: monthLabel, receita: revenue, despesa: expense });
    }
    return data;
  })();

  // Route Status Distribution
  const routeStatusData = [
    { name: 'Finalizadas', value: stats.rotasFinalizadas, color: '#10b981' },
    { name: 'Pernoite', value: stats.rotasPernoite, color: '#fbbf24' },
    { name: 'Em Andamento', value: stats.rotasAtivas, color: '#3b82f6' },
    { name: 'Problema', value: stats.problemas, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Forms State
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [newRoute, setNewRoute] = useState<Partial<Rota>>({ status: StatusRota.PENDENTE });

  // Shunter Registration State
  const [isShunterModalOpen, setIsShunterModalOpen] = useState(false);
  const [newShunter, setNewShunter] = useState<Partial<Usuario & { password?: string }>>({});
  const [createdShunterCredentials, setCreatedShunterCredentials] = useState<{ email: string, password: string } | null>(null);

  // Driver Registration State
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [newDriver, setNewDriver] = useState<Partial<Motorista>>({});
  const [createdDriverCredentials, setCreatedDriverCredentials] = useState<{ email: string, password: string } | null>(null);

  const handleCreateShunter = (e: React.FormEvent) => {
    e.preventDefault();
    if (newShunter.nome && newShunter.email) {
      const password = newShunter.password || Math.random().toString(36).slice(-8);
      onAddShunter({
        name: newShunter.nome!,
        email: newShunter.email!,
        password: password
      });
      setCreatedShunterCredentials({
        email: newShunter.email,
        password: password
      });
      setIsShunterModalOpen(false);
      setNewShunter({});
      addToast('Manobrista cadastrado com sucesso!', 'success');
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newDriver.nome && newDriver.email && newDriver.telefone) {
      try {
        // Mock Password Generation
        const password = Math.random().toString(36).slice(-8);

        await onAddDriver({
          nome: newDriver.nome!,
          email: newDriver.email!,
          telefone: newDriver.telefone!,
          placa: newDriver.placa || '',
          modeloVeiculo: newDriver.modeloVeiculo || '',
          tipo: TipoUsuario.MOTORISTA,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newDriver.nome!)}&background=random`
        });

        setCreatedDriverCredentials({
          email: newDriver.email!,
          password: password
        });

        setIsDriverModalOpen(false);
        setNewDriver({});
        addToast('Motorista cadastrado com sucesso!', 'success');
      } catch (error: any) {
        console.error('Erro ao cadastrar motorista:', error);
        addToast('Erro ao cadastrar motorista: ' + (error.message || 'Erro desconhecido'), 'error');
      }
    }
  };

  const dashboardFileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoute.origin && newRoute.destination && newRoute.driver_id && newRoute.vehicle_id && newRoute.route_number && newRoute.initial_km !== undefined) {
      onAddRoute({
        driver_id: newRoute.driver_id,
        vehicle_id: newRoute.vehicle_id,
        route_number: newRoute.route_number,
        origin: newRoute.origin,
        destination: newRoute.destination,
        date: newRoute.date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
        status: StatusRota.PENDENTE,
        cargo_type: newRoute.cargo_type || 'Seara',
        estimated_revenue: Number(newRoute.estimated_revenue) || 0,
        initial_km: Number(newRoute.initial_km),
        description: newRoute.description
      });
      setIsRouteModalOpen(false);
      setNewRoute({ status: StatusRota.PENDENTE });
      addToast('Nova rota iniciada com sucesso!', 'success');
    } else {
      addToast('Preencha os campos obrigatórios (Motorista, Veículo, Número da Rota, KM e Destino).', 'warning');
    }
  };

  const handleDashboardImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedRoutes = await spreadsheetService.parseRoutes(file);

      let createdCount = 0;
      let skippedCount = 0;

      for (const item of importedRoutes) {
        // 0. Normalize Helpers
        const normalizePlate = (p: string) => p.replace(/[^A-Z0-9]/g, '');
        const normalizeText = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

        // 1. Find Vehicle (Fuzzy Match)
        const vehicle = veiculos.find(v => normalizePlate(v.plate) === normalizePlate(item.plate));
        if (!vehicle) {
          console.warn(`[Import Skipped] Veículo não encontrado para a placa: "${item.plate}" (Normalizada: "${normalizePlate(item.plate)}")`);
          skippedCount++;
          continue;
        }

        // 2. Find Driver (Accent-Insensitive Match)
        const targetName = normalizeText(item.driver_name);

        // Exact normalized match
        let driverId = drivers.find(d => normalizeText(d.nome) === targetName)?.id;

        if (!driverId) {
          // Flexible normalized match (includes)
          const match = drivers.find(d => {
            const driverName = normalizeText(d.nome);
            return driverName.includes(targetName) || targetName.includes(driverName);
          });

          if (match) driverId = match.id;
          else {
            // Try to match by vehicle default plate if any?
            const vehicleDriver = drivers.find(d => normalizePlate(d.placa) === normalizePlate(item.plate));
            if (vehicleDriver) driverId = vehicleDriver.id;
            else {
              console.warn(`[Import Warning] Motorista não encontrado: "${item.driver_name}" (Normalizado: "${targetName}"). Importando sem vínculo.`);
              // Proceed without driverId, but pass original name
            }
          }
        }

        // 3. Create Route (Driver ID might be undefined/null)
        const distance = item.final_km > 0 ? (item.final_km - item.initial_km) : item.total_km;
        const revenue = vehicle.daily_rate + (distance * vehicle.km_rate) + item.unloading_value;
        const status = item.final_km > 0 ? StatusRota.FINALIZADA : StatusRota.EM_ANDAMENTO;

        // Check if route already exists (optional but good)
        // Check if route already exists (Update if yes, Create if no)
        const existing = routes.find(r => r.route_number === item.route_number && r.date === item.date);

        if (existing) {
          // UPDATE EXISTING ROUTE
          await servicoRotas.atualizarRota(existing.id, {
            status: status,
            initial_km: item.initial_km,
            final_km: item.final_km > 0 ? item.final_km : undefined,
            final_date: item.final_km > 0 ? item.date : undefined,
            estimated_revenue: revenue,
            vehicle_id: vehicle.id,
            driver_id: driverId ? driverId : existing.driver_id, // Keep existing if update doesn't find one? Or update to null? Better keep existing.
            original_driver_name: !driverId ? item.driver_name : undefined,
            // If we didn't find a driver now, but one existed, keep it. If none existed, still none.
          });

          // Check for Descarga expenses
          if (item.unloading_value > 0 && driverId) {
            const existingDescarga = expenses.filter(e => e.rotaId === existing.id && e.tipo === TipoDespesa.DESCARGA);
            if (existingDescarga.length === 0) {
              await servicoFinanceiro.criarDespesa({
                rotaId: existing.id,
                motoristaId: driverId,
                tipo: TipoDespesa.DESCARGA,
                valor: item.unloading_value,
                date: item.date,
                observacoes: 'Descarga Importada via Excel (Atualização)'
              });
            }
          }

          // Check for Pernoite (Admin) expenses - only add if not already present
          if (item.pernoite_count > 0 && driverId) { // Only add expense if we have a driver? Or add to route without driver? Expenses need driver?
            // Expenses typically need a driver. If no driver, maybe skip expense creation or assign to null?
            // Type definition for Despesa has motoristaId. If we don't have it, we can't create expense.
            // We'll skip expense creation for now if no driver.
            const existingPernoites = expenses.filter(e => e.rotaId === existing.id && e.tipo === TipoDespesa.PERNOITE_ADMIN);
            if (existingPernoites.length < item.pernoite_count) {
              const needed = item.pernoite_count - existingPernoites.length;
              for (let i = 0; i < needed; i++) {
                await servicoFinanceiro.criarDespesa({
                  rotaId: existing.id,
                  motoristaId: driverId,
                  tipo: TipoDespesa.PERNOITE_ADMIN,
                  valor: vehicle.plate.toUpperCase().startsWith('T') ? 53.50 : 107.00,
                  date: item.date,
                  observacoes: 'Pernoite Importado via Excel (Atualização)'
                });
              }
            }
          }
          console.log(`Rota ${item.route_number} atualizada.`);
          createdCount++; // Count updates as successes too for simplicity in toast
        } else {
          // CREATE NEW ROUTE
          const cargoType = driverId ? 'Seara' : `Seara (PENDENTE: ${item.driver_name})`;

          const newRoute = await servicoRotas.criarRota({
            driver_id: driverId || null, // Allow null
            original_driver_name: !driverId ? item.driver_name : undefined,
            vehicle_id: vehicle.id,
            route_number: item.route_number,
            origin: 'Seara - Bebedouro, SP',
            destination: item.city,
            date: item.date,
            final_date: item.final_km > 0 ? item.date : undefined,
            status: status,
            cargo_type: cargoType,
            initial_km: item.initial_km,
            final_km: item.final_km > 0 ? item.final_km : undefined,
            estimated_revenue: revenue,
          });

          // Handle Descarga Expenses
          if (item.unloading_value > 0 && newRoute && driverId) {
            await servicoFinanceiro.criarDespesa({
              rotaId: newRoute.id,
              motoristaId: driverId,
              tipo: TipoDespesa.DESCARGA,
              valor: item.unloading_value,
              date: item.date,
              observacoes: 'Descarga Importada via Excel'
            });
          }

          // Handle Pernoite (Admin Pernoite Expenses)
          if (item.pernoite_count > 0 && newRoute && driverId) {
            for (let i = 0; i < item.pernoite_count; i++) {
              await servicoFinanceiro.criarDespesa({
                rotaId: newRoute.id,
                motoristaId: driverId,
                tipo: TipoDespesa.PERNOITE_ADMIN,
                valor: vehicle.plate.toUpperCase().startsWith('T') ? 53.50 : 107.00,
                date: item.date,
                observacoes: 'Pernoite Importado via Excel'
              });
            }
          }
          createdCount++;
        }
      }

      addToast(`${createdCount} rotas processadas (novas/atualizadas). ${skippedCount} ignoradas.`, 'success');
      if (onRefresh) onRefresh();

    } catch (error) {
      console.error(error);
      addToast('Erro ao importar arquivo.', 'error');
    } finally {
      if (dashboardFileInputRef.current) dashboardFileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex h-screen bg-white font-sans text-gray-800 relative">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Global Hidden Inputs for Excel Import */}
      <input
        type="file"
        ref={dashboardFileInputRef}
        onChange={handleDashboardImport}
        className="hidden"
        accept=".xlsx, .xls"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        className="hidden"
        accept=".xlsx, .xls"
      />
      {/* Sidebar (Expandable Style) */}
      <aside
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
        className={`${isSidebarExpanded ? 'w-64' : 'w-16'} bg-white border-r border-gray-100 flex flex-col py-6 gap-6 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 transition-all duration-300 ease-in-out group`}
      >
        <div className={`flex items-center justify-center px-4 mb-2 transition-all duration-300`}>
          {isSidebarExpanded ? (
            <img
              src="/ALC-logotipo-dark.png"
              alt="ALC Pereira Filho & Transportes"
              className="h-16 w-auto object-contain"
            />
          ) : (
            <img
              src="/ALC-logotipo-dark.png"
              alt="ALC"
              className="w-10 h-10 object-contain"
            />
          )}
        </div>

        <nav className="flex flex-col gap-2 w-full px-3">
          {['dashboard', 'managerial', 'routes', 'fleet', 'financial', 'rates', 'requests', 'users'].map((tab) => {
            const icons = {
              dashboard: LayoutDashboard,
              managerial: BarChart3,
              routes: Map,
              fleet: Activity,
              financial: Wallet,
              rates: DollarSign,
              requests: FileText,
              users: Users
            };
            const names = {
              dashboard: 'Visão Geral',
              managerial: 'Gerencial',
              routes: 'Rotas',
              fleet: 'Frota',
              financial: 'Financeiro',
              rates: 'Taxas',
              requests: 'Pagamento Avulso',
              users: 'Usuários'
            };
            const Icon = icons[tab as keyof typeof icons];
            const name = names[tab as keyof typeof names];

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex items-center gap-3 h-11 px-2 rounded-xl transition-all ${activeTab === tab ? 'bg-red-50 text-[#D32F2F]' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
                title={!isSidebarExpanded ? name : undefined}
              >
                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                {isSidebarExpanded && (
                  <span className="text-sm font-bold overflow-hidden whitespace-nowrap transition-all duration-300 opacity-100">
                    {name}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto px-3">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 h-11 px-2 rounded-xl text-gray-400 hover:bg-red-50 hover:text-[#D32F2F] transition-all w-full"
            title={!isSidebarExpanded ? "Sair" : undefined}
          >
            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            {isSidebarExpanded && (
              <span className="text-sm font-bold overflow-hidden whitespace-nowrap transition-all duration-300 opacity-100">
                Sair
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#FAFBFF]">
        {/* Top Header */}
        <header className="px-8 py-6 bg-white border-b border-gray-100 flex justify-between items-center shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {activeTab === 'dashboard' ? 'Dashboard Gerencial' :
                activeTab === 'managerial' ? 'Visão Consolidada' :
                  activeTab === 'routes' ? 'Gestão de Rotas' :
                    activeTab === 'fleet' ? 'Controle de Frota' :
                      activeTab === 'financial' ? 'Gestão Financeira' :
                        activeTab === 'rates' ? 'Gerenciamento de Taxas' :
                          activeTab === 'requests' ? 'Registro de Pagamento Avulso' : 'Gestão de Usuários'}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {activeTab === 'managerial' ? 'Dados consolidados com fórmulas de ganho bruto e gastos' :
                activeTab === 'fleet' ? 'Monitoramento mensal de status dos veículos' :
                  activeTab === 'financial' ? 'Gestão financeira e canhotos' :
                    activeTab === 'rates' ? 'Definição de valores de frete e diárias' :
                      activeTab === 'requests' ? 'Registre pagamentos feitos via PIX, OxPay ou dinheiro' : 'Gestão de motoristas e manobristas'}
            </p>
          </div>

          {
            (activeTab === 'fleet' || activeTab === 'managerial') && (
              <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                {activeTab === 'fleet' ? (
                  <>
                    <button
                      className="p-1 hover:bg-white rounded-md transition-colors"
                      onClick={() => setSelectedFleetDate(new Date(selectedFleetDate.getFullYear(), selectedFleetDate.getMonth() - 1, 1))}
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>
                        {selectedFleetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).charAt(0).toUpperCase() + selectedFleetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).slice(1)}
                      </span>
                    </div>
                    <button
                      className="p-1 hover:bg-white rounded-md transition-colors"
                      onClick={() => setSelectedFleetDate(new Date(selectedFleetDate.getFullYear(), selectedFleetDate.getMonth() + 1, 1))}
                    >
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Início</label>
                      <input
                        type="date"
                        className="bg-transparent border-none text-sm font-bold text-gray-700 outline-none focus:ring-0 p-0"
                        value={dateStart}
                        onChange={e => setDateStart(e.target.value)}
                      />
                    </div>
                    <div className="h-4 w-px bg-gray-200"></div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fim</label>
                      <input
                        type="date"
                        className="bg-transparent border-none text-sm font-bold text-gray-700 outline-none focus:ring-0 p-0"
                        value={dateEnd}
                        onChange={e => setDateEnd(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          }

          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
              Atualizar
            </button>
            {activeTab === 'dashboard' && (
              <button
                onClick={() => dashboardFileInputRef.current?.click()}
                className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors shadow-sm shadow-blue-200"
              >
                <Upload className="w-4 h-4" /> Importar Excel
              </button>
            )}
            {activeTab === 'financial' && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-sm font-medium text-white bg-[#10B981] hover:bg-emerald-600 rounded-lg flex items-center gap-2 transition-colors shadow-sm shadow-emerald-200"
              >
                <Upload className="w-4 h-4" /> Importar Excel
              </button>
            )}
            {activeTab === 'routes' && (
              <button
                onClick={() => dashboardFileInputRef.current?.click()}
                className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors shadow-sm shadow-blue-200"
              >
                <Upload className="w-4 h-4" /> Importar Excel
              </button>
            )}
            {activeTab === 'requests' && (
              <button onClick={() => setIsRequestModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-[#D32F2F] hover:bg-red-700 rounded-lg flex items-center gap-2 transition-colors shadow-sm shadow-red-200">
                <Plus className="w-4 h-4" /> Novo Pagamento
              </button>
            )}
            {activeTab === 'users' && (
              <div className="flex gap-2">
                {usersTab === 'drivers' ? (
                  <button onClick={() => setIsDriverModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-[#D32F2F] hover:bg-red-700 rounded-lg flex items-center gap-2 transition-colors shadow-sm shadow-red-200">
                    <Plus className="w-4 h-4" /> Novo Motorista
                  </button>
                ) : (
                  <button onClick={() => setIsShunterModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors shadow-sm shadow-blue-200">
                    <Plus className="w-4 h-4" /> Novo Manobrista
                  </button>
                )}
              </div>
            )}
          </div>

          {activeTab === 'fleet' && (
            <div className="flex items-center gap-4">
              <div className="bg-gray-100 p-1 rounded-lg flex text-xs font-bold">
                <button
                  onClick={() => setFleetView('grid')}
                  className={`px-3 py-1.5 rounded transition-all ${fleetView === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Grade
                </button>
                <button
                  onClick={() => setFleetView('report')}
                  className={`px-3 py-1.5 rounded transition-all ${fleetView === 'report' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Relatório
                </button>
              </div>
              <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-bold text-gray-700 shadow-sm">
                <button className="p-1 hover:bg-gray-100 rounded" onClick={() => setSelectedFleetDate(new Date(selectedFleetDate.getFullYear(), selectedFleetDate.getMonth() - 1, 1))}><ChevronLeft className="w-4 h-4" /></button>
                <span className="w-32 text-center">
                  {selectedFleetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).charAt(0).toUpperCase() + selectedFleetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).slice(1)}
                </span>
                <button className="p-1 hover:bg-gray-100 rounded" onClick={() => setSelectedFleetDate(new Date(selectedFleetDate.getFullYear(), selectedFleetDate.getMonth() + 1, 1))}><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-auto p-8">

          {activeTab === 'managerial' && (
            <ManagerialDashboard
              routes={routes}
              expenses={expenses}
              vehicles={veiculos}
              drivers={drivers}
              solicitacoes={solicitacoes}
              dateStart={dateStart}
              dateEnd={dateEnd}
              onAddToast={addToast}
              onRefresh={onRefresh}
            />
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Filters Bar */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Data Início</label>
                  <div className="relative">
                    <input type="date" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" value={dateStart} onChange={e => setDateStart(e.target.value)} />
                    <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Data Fim</label>
                  <div className="relative">
                    <input type="date" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
                    <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Motorista</label>
                  <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none" value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)}>
                    <option value="all">Todos</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Placa</label>
                  <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none" value={selectedPlate} onChange={e => setSelectedPlate(e.target.value)}>
                    <option value="all">Todas</option>
                    {veiculos.map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)}
                  </select>
                </div>
                <button className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200">
                  <Filter className="w-5 h-5" />
                </button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Revenue */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36">
                  <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Faturamento Total</p>
                    <h3 className="text-3xl font-bold text-gray-900">R$ {stats.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 w-fit px-2 py-1 rounded">
                    <TrendingUp className="w-3 h-3" />
                    <span>+ Receita Bruta</span>
                  </div>
                </div>

                {/* Expenses */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36">
                  <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Despesas Totais</p>
                    <h3 className="text-3xl font-bold text-gray-900">R$ {stats.despesasTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 w-fit px-2 py-1 rounded">
                    <TrendingDown className="w-3 h-3" />
                    <span>- Custos Operacionais</span>
                  </div>
                </div>

                {/* Net Profit */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36">
                  <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Lucro Líquido</p>
                    <h3 className={`text-3xl font-bold ${stats.lucroLiquido >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                      R$ {stats.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                  </div>
                  <div className={`flex items-center gap-2 text-xs font-bold w-fit px-2 py-1 rounded ${stats.lucroLiquido >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                    <span>{stats.receitaTotal > 0 ? ((stats.lucroLiquido / stats.receitaTotal) * 100).toFixed(1) : 0}% Margem</span>
                  </div>
                </div>

                {/* Routes Count */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36">
                  <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total de Rotas</p>
                    <h3 className="text-3xl font-bold text-gray-900">{filteredRoutes.length}</h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="text-purple-600 bg-purple-50 px-2 py-1 rounded">{stats.rotasAtivas} Ativas</span>
                    <span className="text-green-600 bg-green-50 px-2 py-1 rounded">{stats.rotasFinalizadas} Concluídas</span>
                  </div>
                  <div className="absolute top-6 right-6 p-2 bg-gray-50 rounded-lg text-gray-400">
                    <Truck className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Middle Section: Driver Performance & Route Status */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Desempenho por Motorista (Takes up 2/3) */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h3 className="text-lg font-bold text-gray-900">Desempenho por Motorista</h3>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar motorista..."
                        value={driverSearchQuery}
                        onChange={(e) => setDriverSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-50">
                          <th className="pb-4 text-xs font-bold text-gray-400 uppercase">Motorista</th>
                          <th className="pb-4 text-xs font-bold text-gray-400 uppercase text-center">Rotas</th>
                          <th className="pb-4 text-xs font-bold text-gray-400 uppercase text-center">KM Total</th>
                          <th className="pb-4 text-xs font-bold text-gray-400 uppercase text-center">Média Comb.</th>
                          <th className="pb-4 text-xs font-bold text-gray-400 uppercase text-right">Faturamento</th>
                          <th className="pb-4 text-xs font-bold text-gray-400 uppercase text-right">Lucro</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {driverPerformance.map(driver => (
                          <tr key={driver.id} className="group hover:bg-gray-50 transition-colors">
                            <td className="py-4 text-sm font-bold text-gray-700">{driver.name.toUpperCase()}</td>
                            <td className="py-4 text-sm font-medium text-gray-600 text-center">{driver.routesCount}</td>
                            <td className="py-4 text-sm font-medium text-gray-500 text-center">{driver.totalKm}</td>
                            <td className="py-4 text-sm font-bold text-blue-600 text-center">
                              {driver.averageFuel > 0 ? `${driver.averageFuel.toFixed(1)} km/L` : '-'}
                            </td>
                            <td className="py-4 text-sm font-medium text-gray-500 text-right">R$ {driver.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className={`py-4 text-sm font-bold text-right ${driver.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {driver.profit < 0 ? '-' : ''}R$ {Math.abs(driver.profit).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Status das Rotas (Takes up 1/3) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Status das Rotas</h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                          <span className="text-sm font-medium text-gray-600">Finalizadas</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{stats.rotasFinalizadas}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${filteredRoutes.length > 0 ? (stats.rotasFinalizadas / filteredRoutes.length) * 100 : 0}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                          <span className="text-sm font-medium text-gray-600">Pernoite</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{stats.rotasPernoite}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${filteredRoutes.length > 0 ? (stats.rotasPernoite / filteredRoutes.length) * 100 : 0}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                          <span className="text-sm font-medium text-gray-600">Em Andamento</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{stats.rotasAtivas}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-gray-500 h-2 rounded-full" style={{ width: `${filteredRoutes.length > 0 ? (stats.rotasAtivas / filteredRoutes.length) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Route History Table */}
                <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-hidden">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Histórico de Rotas</h3>
                    <span className="text-xs text-gray-400">Exibindo {filteredRoutes.length} registros</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left table-fixed">
                      <thead>
                        <tr className="border-b border-gray-50">
                          <th className="pb-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase w-[15%]">Rota</th>
                          <th className="pb-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase w-[25%] truncate">Motorista</th>
                          <th className="pb-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase text-center w-[15%]">Placa</th>
                          <th className="pb-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase text-center w-[15%]">Status</th>
                          <th className="pb-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase text-center w-[10%]">Receita</th>
                          <th className="pb-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase text-center w-[10%]">Despesas</th>
                          <th className="pb-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase text-center w-[10%]">Lucro</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredRoutes.slice(0, 10).map(route => { // Showing top 10 for performance/mock
                          const driver = drivers.find(d => d.id === route.driver_id);
                          const vehicle = veiculos.find(v => v.id === route.vehicle_id); // This might be undefined if not linked
                          const routeExpenses = expenses.filter(e => e.rotaId === route.id);
                          const totalExpenses = routeExpenses.reduce((acc, e) => acc + e.valor, 0);

                          const revenue = getRouteRevenue(route);
                          const profit = revenue - totalExpenses;

                          return (
                            <tr key={route.id} className="hover:bg-gray-50 transition-colors" onClick={() => setSelectedRoute(route)} /**/ >
                              <td className="py-2 sm:py-4 text-xs sm:text-sm font-bold text-gray-700">#{route.route_number || String(route.id).substring(0, 8)}</td>
                              <td className="py-2 sm:py-4 text-xs sm:text-sm font-medium text-gray-600 truncate max-w-[150px]">{driver?.nome || route.original_driver_name || 'N/A'}</td>
                              <td className="py-2 sm:py-4 text-center">
                                <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase bg-gray-100 rounded px-1 sm:px-2 py-0.5 sm:py-1 truncate block w-full max-w-[80px] mx-auto">
                                  {vehicle?.plate || (driver?.placa ? String(driver.placa) : '-')}
                                </span>
                              </td>
                              <td className="py-2 sm:py-4 text-center">
                                <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap ${route.status === 'Finalizada' ? 'bg-blue-100 text-blue-700' :
                                  route.status === 'Em Andamento' ? 'bg-gray-100 text-gray-700' :
                                    route.status === 'Pernoite' ? 'bg-amber-100 text-amber-700' :
                                      'bg-gray-100 text-gray-500'
                                  }`}>
                                  {route.status}
                                </span>
                              </td>
                              <td className="py-2 sm:py-4 text-xs sm:text-sm font-medium text-gray-600 text-center whitespace-nowrap">R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="py-2 sm:py-4 text-xs sm:text-sm font-medium text-red-500 text-center whitespace-nowrap">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className={`py-2 sm:py-4 text-xs sm:text-sm font-bold text-center whitespace-nowrap ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {profit < 0 ? '-' : ''}R$ {Math.abs(profit).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FINANCIAL CLOSING TAB */}



          {/* FINANCIAL TAB (Fechamento) */}
          {/* FINANCIAL CLOSING TAB */}
          {
            activeTab === 'financial' && (
              <div className="space-y-6">
                {/* Navigation Tabs for Financial */}
                <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
                  <button
                    onClick={() => setFinancialView('current')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${financialView === 'current' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    Fechamento Atual
                  </button>
                  <button
                    onClick={() => setFinancialView('history')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${financialView === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    Histórico de Fechamentos
                  </button>
                  <button
                    onClick={() => setFinancialView('pernoites')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${financialView === 'pernoites' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    Pernoites Pendentes
                    {routes.filter(r => r.status === StatusRota.PERNOITE).length > 0 && (
                      <span className="ml-2 bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[10px]">
                        {routes.filter(r => r.status === StatusRota.PERNOITE).length}
                      </span>
                    )}
                  </button>
                </div>

                {/* CURRENT CLOSURE VIEW */}
                {financialView === 'current' && (
                  <>
                    {/* Period Selection & Pre-analysis Summary */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                      <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">Período do Fechamento</h3>
                          <p className="text-sm text-gray-400 mb-4">Selecione o período para analisar as rotas e realizar o fechamento.</p>

                          <div className="flex flex-wrap gap-4">
                            <div className="flex-1 min-w-[200px]">
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data Início</label>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="date"
                                  value={closureDateStart}
                                  onChange={(e) => setClosureDateStart(e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                />
                              </div>
                            </div>
                            <div className="flex-1 min-w-[200px]">
                              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data Fim</label>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="date"
                                  value={closureDateEnd}
                                  onChange={(e) => setClosureDateEnd(e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Pre-analysis Summary Box */}
                        {(() => {
                          const periodRoutes = routes.filter(r => r.date >= closureDateStart && r.date <= closureDateEnd);
                          const expectedRev = periodRoutes.reduce((acc, r) => acc + (getRouteRevenue(r) || 0), 0);
                          const periodRouteIds = new Set(periodRoutes.map(r => r.id));
                          const periodExpenses = expenses.filter(e => periodRouteIds.has(e.rotaId))
                            .filter(e => e.tipo !== TipoDespesa.DESCARGA)
                            .reduce((acc, e) => acc + (Number(e.valor) || 0), 0);

                          return (
                            <div className="w-full lg:w-80 bg-blue-50/50 rounded-2xl p-5 border border-blue-100 flex flex-col gap-3">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-blue-600 uppercase">Pré-Análise</span>
                                <Activity className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">Rotas Localizadas</span>
                                  <span className="text-sm font-bold text-gray-900">{periodRoutes.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">Receita Esperada</span>
                                  <span className="text-sm font-bold text-green-600">R$ {expectedRev.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">Despesas Manuais</span>
                                  <span className="text-sm font-bold text-red-600">R$ {periodExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                              <div className="pt-2 border-t border-blue-100 flex justify-between items-center">
                                <span className="text-xs font-bold text-blue-700">Saldo Previsto</span>
                                <span className="text-sm font-black text-blue-700">R$ {(expectedRev - periodExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    {/* Calculate Stats */}
                    {(() => {
                      let totalValue = 0;
                      let totalReceivable = 0;
                      let divergence = 0;

                      const filteredClosureRows = closureRows.filter(row => {
                        if (closureStatusFilter === 'all') return true;
                        return row.status === closureStatusFilter;
                      });

                      filteredClosureRows.forEach(row => {
                        const kmRate = Number(row.vehicle?.km_rate) || 0;
                        const valKmSeara = Number(row.km_seara) * kmRate;

                        // 1. Valor Total = Valor KM (Seara) + Valor Diária
                        // Representa o que a ALC espera receber
                        const rowTotalValue = valKmSeara + Number(row.daily_rate);
                        totalValue += rowTotalValue;

                        // 2. Valor a Receber (Real) = Valor Total (Seara Column)
                        // Nota: No ClosureTable, val_total_seara já é sum(imported + descarga)
                        const rowSearaValue = (Number(row.val_total_seara) || 0) + Number(row.descarga);
                        totalReceivable += rowSearaValue;
                      });

                      divergence = totalValue - totalReceivable;

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {/* Total Value */}
                          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">VALOR TOTAL</p>
                              <h3 className="text-2xl font-bold text-gray-900 mb-1">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                              <span className="text-xs text-gray-400">Calculado (KM Seara + Diária)</span>
                            </div>
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                              <span className="font-bold text-lg">$</span>
                            </div>
                          </div>

                          {/* Receivable */}
                          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">VALOR A RECEBER (REAL)</p>
                              <h3 className="text-2xl font-bold text-green-600 mb-1">R$ {totalReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                              <span className="text-xs text-gray-400">Total Valor total (Seara)</span>
                            </div>
                            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                              <Factory className="w-5 h-5" />
                            </div>
                          </div>

                          {/* Divergence */}
                          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">DIVERGÊNCIA</p>
                              <h3 className={`text-2xl font-bold mb-1 ${divergence < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                R$ {divergence.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </h3>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Total - VALOR A RECEBER (REAL)</span>
                              </div>
                            </div>
                            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                              <Activity className="w-5 h-5" />
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Financial Performance Chart */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-gray-800">Desempenho Financeiro</h3>
                          <div className="flex items-center gap-4 text-xs font-medium">
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <span className="text-gray-500">Receita</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-red-400"></div>
                              <span className="text-gray-500">Despesas</span>
                            </div>
                          </div>
                        </div>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={financialChartData}>
                              <defs>
                                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(val) => `R$ ${val} `} />
                              <RechartsTooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR')} `, '']}
                              />
                              <Area type="monotone" dataKey="receita" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorReceita)" />
                              <Area type="monotone" dataKey="despesa" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorDespesa)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Route Status Distribution Chart */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-gray-800">Distribuição de Status</h3>
                        </div>
                        <div className="h-64 flex items-center justify-center relative">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <PieChart>
                              <Pie
                                data={routeStatusData}
                                cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value"
                              >
                                {routeStatusData.map((entry, index) => (
                                  <Cell key={`cell - ${index} `} fill={entry.color} />
                                ))}
                              </Pie>
                              <RechartsTooltip />
                              <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                            <span className="text-gray-400 text-xs font-bold uppercase">Total</span>
                            <span className="text-2xl font-bold text-gray-900">{filteredRoutes.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {closureRows.length > 0 ? (
                      <ClosureTable
                        rows={closureRows}
                        onSave={(updatedRows) => setClosureRows(updatedRows)}
                        statusFilter={closureStatusFilter}
                        onStatusFilterChange={setClosureStatusFilter}
                      />
                    ) : (
                      <div className="flex items-center justify-center p-8 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
                        Importe uma planilha para visualizar o fechamento.
                      </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        onClick={() => {
                          const ws = XLSX.utils.json_to_sheet(closureRows.map((row: any) => {
                            const kmRate = (row.vehicle?.km_rate || 0);
                            const valKmSeara = (row.km_seara || 0) * kmRate;
                            const valTotalKmReal = (row.km_real || 0) * kmRate;
                            const valKmPerdido = Math.max(0, valTotalKmReal - valKmSeara);
                            const totalSeara = (row.val_total_seara || 0) + (row.descarga || 0);
                            const totalALC = (row.daily_rate || 0) + valKmSeara + (row.descarga || 0);

                            return {
                              'Tipo Veículo': row.vehicle?.model || '-',
                              'Identificador': row.route_number || '-',
                              'Placa': row.vehicle?.plate || '-',
                              'KM Real': row.km_real,
                              'KM Seara (Edit)': row.km_seara,
                              'Descarga (Edit)': row.descarga,
                              'Valor KM (Seara)': valKmSeara,
                              'Valor KM (Perdido)': valKmPerdido,
                              'Valor Diária': row.daily_rate,
                              'Valor total (Seara)': totalSeara,
                              'Valor Total (esperado ALC)': totalALC,
                              'Data Pagamento': row.payment_date || '-',
                              'Status': row.status
                            };
                          }));
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, "Fechamento Atual");
                          XLSX.writeFile(wb, `fechamento_atual_${new Date().toISOString().split('T')[0]}.xlsx`);
                        }}
                        className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 flex items-center gap-2 transition-transform transform hover:-translate-y-0.5"
                      >
                        <Download className="w-5 h-5" /> Excel
                      </button>
                      <button
                        onClick={() => {
                          const doc = new jsPDF({ orientation: 'landscape' });
                          const tableData = closureRows.map((row: any) => {
                            const kmRate = (row.vehicle?.km_rate || 0);
                            const valKmSeara = (row.km_seara || 0) * kmRate;
                            const valTotalKmReal = (row.km_real || 0) * kmRate;
                            const valKmPerdido = Math.max(0, valTotalKmReal - valKmSeara);
                            const totalSeara = (row.val_total_seara || 0) + (row.descarga || 0);
                            const totalALC = (row.daily_rate || 0) + valKmSeara + (row.descarga || 0);

                            return [
                              row.vehicle?.model || '-',
                              row.route_number || '-',
                              row.vehicle?.plate || '-',
                              (row.km_real || 0).toLocaleString('pt-BR'),
                              (row.km_seara || 0).toLocaleString('pt-BR'),
                              (row.descarga || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                              valKmSeara.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                              valKmPerdido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                              (row.daily_rate || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                              totalSeara.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                              totalALC.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                              row.payment_date || '-',
                              row.status
                            ];
                          });

                          doc.text(`Fechamento Financeiro ALC - Preview(${new Date().toLocaleDateString('pt-BR')})`, 14, 15);
                          autoTable(doc, {
                            head: [['Tipo', 'Rota', 'Placa', 'KM R.', 'KM S.', 'Desc.', 'V. KM S.', 'V. KM P.', 'Diária', 'Tot. Seara', 'Tot. ALC', 'Pgto', 'Status']],
                            body: tableData,
                            startY: 20,
                            styles: { fontSize: 7 },
                            headStyles: { fillColor: [211, 47, 47] }
                          });
                          doc.save(`fechamento_preview_${new Date().toISOString().split('T')[0]}.pdf`);
                        }}
                        className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 flex items-center gap-2 transition-transform transform hover:-translate-y-0.5"
                      >
                        <FileText className="w-5 h-5" /> PDF
                      </button>
                      <button
                        onClick={async () => {
                          if (closureRows.length === 0) {
                            addToast('Não há dados para salvar.', 'warning');
                            return;
                          }

                          // Calculate totals again for saving
                          let totalValue = 0;
                          let totalReceivable = 0;
                          let divergence = 0;

                          closureRows.forEach(row => {
                            const kmRate = row.vehicle?.km_rate || 0;
                            const valKmSeara = row.km_seara * kmRate;

                            // Corrected: Total (ALC) includes Descarga
                            const rowTotalValue = valKmSeara + row.daily_rate + row.descarga;
                            totalValue += rowTotalValue;

                            // Corrected: Total (Receivable/Seara) includes val_total_seara + Descarga
                            const rowSearaValue = (row.val_total_seara || 0) + row.descarga;
                            totalReceivable += rowSearaValue;
                          });
                          divergence = totalValue - totalReceivable;

                          try {
                            // Check for duplicates before saving
                            const previousClosures = await servicoFinanceiro.obterFechamentos();
                            const closedRouteNumbers = new Set<string>();

                            previousClosures.forEach(closure => {
                              if (Array.isArray(closure.rows)) {
                                closure.rows.forEach((row: any) => {
                                  if (row.route_number) {
                                    closedRouteNumbers.add(row.route_number);
                                  }
                                });
                              }
                            });

                            const duplicates = closureRows.filter(row => closedRouteNumbers.has(row.route_number));

                            if (duplicates.length > 0) {
                              const duplicateNumbers = duplicates.map(d => d.route_number).join(', ');
                              addToast(`Erro: As seguintes rotas já possuem fechamento: ${duplicateNumbers} `, 'error');
                              return;
                            }

                            const closureData: Omit<FinancialClosure, 'id' | 'created_at'> = {
                              date: new Date().toISOString(),
                              total_value: totalValue,
                              total_receivable: totalReceivable,
                              divergence: divergence,
                              rows: closureRows
                            };

                            await servicoFinanceiro.salvarFechamento(closureData);
                            addToast('Fechamento salvo com sucesso!', 'success');
                            setFinancialView('history');
                            servicoFinanceiro.obterFechamentos().then(setClosureHistory);
                          } catch (error) {
                            console.error('Error saving closure:', error);
                            addToast('Erro ao salvar fechamento.', 'error');
                          }
                        }}
                        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2 transition-transform transform hover:-translate-y-0.5"
                      >
                        <Save className="w-5 h-5" />
                        Salvar Fechamento
                      </button>
                    </div>
                  </>
                )
                }

                {/* PERNOITES PENDENTES VIEW */}
                {
                  financialView === 'pernoites' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900">Pernoites Pendentes de Registro</h3>
                        <p className="text-sm text-gray-400">Rotas em status de Pernoite que aguardam lançamento financeiro</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-[#FAFBFF] border-b border-gray-100">
                            <tr>
                              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Motorista</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Rota / Veículo</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Data</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {(() => {
                              const pernoitesPendentes = routes.filter(r => {
                                if (r.status !== StatusRota.PERNOITE) return false;
                                // Check if an expense of type PERNOITE_ADMIN already exists for this route
                                return !expenses.some(e => e.rotaId === r.id && e.tipo === TipoDespesa.PERNOITE_ADMIN);
                              });

                              if (pernoitesPendentes.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                      Nenhum pernoite pendente de registro no momento.
                                    </td>
                                  </tr>
                                );
                              }

                              return pernoitesPendentes.map(route => (
                                <tr key={route.id} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="px-6 py-4 font-medium text-gray-900">
                                    {drivers.find(d => d.id === route.driver_id)?.nome || route.original_driver_name || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-gray-900 font-bold">{route.route_number || `#${route.id.substring(0, 6)} `}</div>
                                    <div className="text-gray-400 text-xs">{veiculos.find(v => v.id === route.vehicle_id)?.plate || 'N/A'}</div>
                                  </td>
                                  <td className="px-6 py-4 text-gray-600">
                                    {new Date(route.date).toLocaleDateString('pt-BR')}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold uppercase border border-amber-100">
                                      Pernoite Ativa
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button
                                      onClick={() => {
                                        setRouteForPernoiteExpense(route);
                                        const vehicle = veiculos.find(v => v.id === route.vehicle_id);
                                        const plate = vehicle?.plate || '';
                                        setPernoiteAdminCost(plate.toUpperCase().startsWith('T') ? '53.50' : '107.00');
                                        setIsPernoiteAdminModalOpen(true);
                                      }}
                                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 ml-auto"
                                    >
                                      <Receipt className="w-4 h-4" />
                                      Registrar Despesa
                                    </button>
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                }

                {/* HISTORY VIEW */}
                {
                  financialView === 'history' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-6 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900">Histórico de Fechamentos</h3>
                      </div>
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#FAFBFF] border-b border-gray-100">
                          <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Data</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Valor Total</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Recebido</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Divergência</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {closureHistory.map((closure) => (
                            <tr key={closure.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-gray-900 font-medium">
                                {new Date(closure.date).toLocaleString('pt-BR')}
                              </td>
                              <td className="px-6 py-4 text-gray-600">
                                R$ {closure.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4 text-green-600 font-medium">
                                R$ {closure.total_receivable.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className={`px-6 py-4 font-bold ${closure.divergence < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                R$ {closure.divergence.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedClosure(closure);
                                    setFinancialView('detail');
                                  }}
                                  className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                                >
                                  Ver Detalhes
                                </button>
                              </td>
                            </tr>
                          ))}
                          {closureHistory.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                Nenhum fechamento salvo encontrado.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )
                }

                {/* DETAIL VIEW */}
                {
                  financialView === 'detail' && selectedClosure && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <button
                            onClick={() => setFinancialView('history')}
                            className="text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1 mb-2 text-sm"
                          >
                            <ChevronLeft className="w-4 h-4" /> Voltar para Histórico
                          </button>
                          <h3 className="text-2xl font-bold text-gray-900">
                            Fechamento: {selectedClosure.date.includes('T') ?
                              new Date(selectedClosure.date).toLocaleString('pt-BR')
                              : selectedClosure.date.split('-').reverse().join('/')}
                          </h3>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              // Export to PDF
                              const doc = new jsPDF({ orientation: 'landscape' });
                              const tableData = selectedClosure.rows.map((row: any) => {
                                const kmRate = (row.vehicle?.km_rate || 0);
                                const valKmSeara = (row.km_seara || 0) * kmRate;
                                const valTotalKmReal = (row.km_real || 0) * kmRate;
                                const valKmPerdido = Math.max(0, valTotalKmReal - valKmSeara);
                                const totalSeara = (row.val_total_seara || 0) + (row.descarga || 0);
                                const totalALC = (row.daily_rate || 0) + valKmSeara + (row.descarga || 0);

                                return [
                                  row.vehicle?.model || '-',
                                  row.route_number || '-',
                                  row.vehicle?.plate || '-',
                                  (row.km_real || 0).toLocaleString('pt-BR'),
                                  (row.km_seara || 0).toLocaleString('pt-BR'),
                                  (row.descarga || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                                  valKmSeara.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                                  valKmPerdido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                                  (row.daily_rate || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                                  totalSeara.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                                  totalALC.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                                  row.payment_date || '-',
                                  row.status
                                ];
                              });

                              doc.text(`Fechamento Financeiro ALC - ${new Date(selectedClosure.date).toLocaleString('pt-BR')} `, 14, 15);

                              autoTable(doc, {
                                head: [['Tipo', 'Rota', 'Placa', 'KM R.', 'KM S.', 'Desc.', 'V. KM S.', 'V. KM P.', 'Diária', 'Tot. Seara', 'Tot. ALC', 'Pgto', 'Status']],
                                body: tableData,
                                startY: 20,
                                styles: { fontSize: 7 },
                                headStyles: { fillColor: [211, 47, 47] }
                              });

                              doc.save(`fechamento_${new Date(selectedClosure.date).toISOString().split('T')[0]}.pdf`);
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors shadow-sm"
                          >
                            <FileText className="w-4 h-4" /> PDF
                          </button>
                          <button
                            onClick={() => {
                              // Export to Excel
                              const ws = XLSX.utils.json_to_sheet(selectedClosure.rows.map((row: any) => {
                                const kmRate = (row.vehicle?.km_rate || 0);
                                const valKmSeara = (row.km_seara || 0) * kmRate;
                                const valTotalKmReal = (row.km_real || 0) * kmRate;
                                const valKmPerdido = Math.max(0, valTotalKmReal - valKmSeara);
                                const totalSeara = (row.val_total_seara || 0) + (row.descarga || 0);
                                const totalALC = (row.daily_rate || 0) + valKmSeara + (row.descarga || 0);

                                return {
                                  'Tipo Veículo': row.vehicle?.model || '-',
                                  'Identificador': row.route_number || '-',
                                  'Placa': row.vehicle?.plate || '-',
                                  'KM Real': row.km_real,
                                  'KM Seara (Edit)': row.km_seara,
                                  'Descarga (Edit)': row.descarga,
                                  'Valor KM (Seara)': valKmSeara,
                                  'Valor KM (Perdido)': valKmPerdido,
                                  'Valor Diária': row.daily_rate,
                                  'Valor total (Seara)': totalSeara,
                                  'Valor Total (esperado ALC)': totalALC,
                                  'Data Pagamento': row.payment_date || '-',
                                  'Status': row.status
                                };
                              }));
                              const wb = XLSX.utils.book_new();
                              XLSX.utils.book_append_sheet(wb, ws, "Fechamento");
                              XLSX.writeFile(wb, `fechamento_${new Date(selectedClosure.date).toISOString().split('T')[0]}.xlsx`);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors shadow-sm"
                          >
                            <Download className="w-4 h-4" /> Excel
                          </button>
                        </div>
                      </div>

                      {/* Summary Cards for Detail View */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">VALOR TOTAL</p>
                          <p className="text-xl font-bold text-gray-900">R$ {selectedClosure.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">VALOR RECEBIDO</p>
                          <p className="text-xl font-bold text-green-600">R$ {selectedClosure.total_receivable.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">DIVERGÊNCIA</p>
                          <p className={`text-xl font-bold ${selectedClosure.divergence < 0 ? 'text-red-500' : 'text-gray-900'}`}>R$ {selectedClosure.divergence.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                      </div>

                      <ClosureTable rows={selectedClosure.rows} readOnly={true} />
                    </div>
                  )
                }
              </div>
            )}



          {/* ROUTES TAB */}
          {
            activeTab === 'routes' && (
              <div className="flex flex-col h-full">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-900">Gestão de Rotas</h2>
                    <div className="flex gap-4">
                      <div className="flex gap-2">
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="date"
                            value={dateStart}
                            onChange={(e) => setDateStart(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                        </div>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="date"
                            value={dateEnd}
                            onChange={(e) => setDateEnd(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => dashboardFileInputRef.current?.click()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Importar Excel
                        </button>
                        <button
                          onClick={() => {
                            setNewRoute({
                              status: StatusRota.PENDENTE,
                              origin: 'Seara - Bebedouro, SP',
                              cargo_type: 'Seara',
                              date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
                            });
                            setIsRouteModalOpen(true);
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Nova Rota
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs font-bold text-gray-500 uppercase bg-gray-50">
                        <tr>
                          <th className="px-4 py-3">STATUS</th>
                          <th className="px-4 py-3">NÚMERO DA ROTA</th>
                          <th className="px-4 py-3">PLACA</th>
                          <th className="px-4 py-3">CIDADE</th>
                          <th className="px-4 py-3">MOTORISTA</th>
                          <th className="px-4 py-3 text-blue-600">DATA DE INÍCIO</th>
                          <th className="px-4 py-3 text-blue-600">DATA DE FINALIZAÇÃO</th>
                          <th className="px-4 py-3">KM INICIAL</th>
                          <th className="px-4 py-3">KM FINAL</th>
                          <th className="px-4 py-3 text-blue-600 animate-flash-orange-text">KM SEARA (EDIT)</th>
                          <th className="px-4 py-3">TOTAL DE KM</th>
                          <th className="px-4 py-3">RECEITA TOTAL</th>
                          <th className="px-4 py-3">DESPESAS</th>
                          <th className="px-4 py-3">LUCRO ESTIMADO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredRoutes.map((route) => {
                          const driver = drivers.find(d => d.id === route.driver_id);
                          const routeExpenses = expenses.filter(e => e.rotaId === route.id);
                          const totalExpenses = routeExpenses
                            .filter(e => e.tipo !== TipoDespesa.DESCARGA)
                            .reduce((sum, exp) => sum + exp.valor, 0);



                          const revenue = getRouteRevenue(route);
                          const vehicle = route.vehicle_id ?
                            veiculos.find(v => v.id === route.vehicle_id)
                            : (driver?.placa ? veiculos.find(v => v.plate === driver.placa) : null);

















                          const profit = revenue - totalExpenses;

                          return (
                            <tr key={route.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedRoute(route)} /**/ >
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${route.status === StatusRota.FINALIZADA ? 'bg-green-100 text-green-700' :
                                  route.status === StatusRota.EM_ANDAMENTO ? 'bg-blue-100 text-blue-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  } `}>
                                  {route.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-mono text-gray-600">
                                  {route.route_number || `#${route.id.substring(0, 6).toUpperCase()} `}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-medium text-gray-900">
                                  {vehicle?.plate || driver?.placa || '-'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-gray-900">{route.origin}</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {driver?.nome || route.original_driver_name || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {route.date ? new Date(route.date + 'T00:00:00').toLocaleDateString('pt-BR') : 'dd/mm/aaaa'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                <input
                                  type="date"
                                  defaultValue={route.final_date ? new Date(route.final_date).toISOString().split('T')[0] : ''}
                                  onBlur={async (e) => {
                                    const newValue = e.target.value;
                                    if (newValue !== route.final_date) {
                                      try {
                                        await servicoRotas.atualizarRota(route.id, { final_date: newValue });
                                        addToast('Data de finalização atualizada!', 'success');
                                        if (onRefresh) onRefresh();
                                      } catch (err: any) {
                                        console.error('Erro ao atualizar data de finalização:', err);
                                        if (err?.code === 'PGRST204' || err?.message?.includes('final_date')) {
                                          addToast('Coluna "final_date" não encontrada. Verifique se executou o script SQL.', 'error');
                                        } else {
                                          addToast('Erro ao atualizar data de finalização', 'error');
                                        }
                                      }
                                    }
                                  }}
                                  className="bg-transparent border-none focus:ring-0 p-0 text-sm text-blue-600 font-bold w-full"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {route.initial_km ? route.initial_km.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {route.final_km ? route.final_km.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  step="0.01"
                                  defaultValue={route.km_final_seara || 0}
                                  onBlur={async (e) => {
                                    const newValue = parseFloat(e.target.value);
                                    if (newValue !== route.km_final_seara) {
                                      try {
                                        await servicoRotas.atualizarRota(route.id, { km_final_seara: newValue });
                                        addToast('KM Seara atualizado!', 'success');
                                        if (onRefresh) onRefresh();
                                      } catch (err) {
                                        console.error('Erro ao atualizar KM Seara:', err);
                                        addToast('Erro ao atualizar KM Seara', 'error');
                                      }
                                    }
                                  }}
                                  className="w-24 px-2 py-1 text-center font-bold text-blue-600 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all animate-flash-orange-box"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-gray-900">
                                {route.final_km && route.initial_km ?
                                  (route.final_km - route.initial_km).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' km' :
                                  '-'
                                }
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-blue-600">
                                R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-orange-600">
                                R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-sm font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          }

          {/* FLEET CONTROL TAB */}
          {/* REQUESTS TAB */}
          {
            activeTab === 'requests' && (
              <div className="flex flex-col h-full">
                {/* Content */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
                  {solicitacoes.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                      <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4">
                        <Receipt className="w-8 h-8 text-purple-300" />
                      </div>
                      <p className="text-gray-400 font-medium">Nenhum pagamento avulso registrado.</p>
                      <p className="text-gray-300 text-sm mt-1">Clique em "Novo Pagamento" para registrar.</p>
                    </div>
                  ) : (
                    <div className="overflow-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#FAFBFF] border-b border-gray-100">
                          <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Motorista</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Método</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Categoria</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Motivo</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Data</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Valor</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Comprovante</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {solicitacoes.map(req => {
                            const r = req as any;
                            const driverId = req.motoristaId || r.driver_id;
                            const driver = drivers.find(d => d.id === driverId);
                            const metodo = req.metodoPagamento || r.metodo_pagamento || '';
                            const tipo = req.tipo || r.type || '';
                            const descricao = req.descricao || r.description || '';
                            const valor = req.valor || r.amount || 0;
                            const comprovante = req.comprovanteUrl || r.comprovante_url || '';
                            const metodoColors: Record<string, string> = {
                              'PIX': 'bg-green-50 text-green-700',
                              'OxPay': 'bg-blue-50 text-blue-700',
                              'Dinheiro': 'bg-amber-50 text-amber-700',
                              'Outro': 'bg-gray-100 text-gray-600',
                            };
                            return (
                              <tr key={req.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSelectedPayment({ ...req, _driver: driver, _metodo: metodo, _tipo: tipo, _descricao: descricao, _valor: valor, _comprovante: comprovante })}>
                                <td className="px-6 py-4 font-medium text-gray-900">
                                  {driver?.nome || driver?.name || 'N/A'}
                                </td>
                                <td className="px-6 py-4">
                                  {metodo ? (
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${metodoColors[metodo] || 'bg-gray-50 text-gray-500'}`}>
                                      {metodo}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">{'\u2014'}</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-gray-600">{tipo}</td>
                                <td className="px-6 py-4 text-gray-600 truncate max-w-[250px]">{descricao || '\u2014'}</td>
                                <td className="px-6 py-4 text-gray-600">{new Date(req.date).toLocaleDateString('pt-BR')}</td>
                                <td className="px-6 py-4 font-bold text-gray-900">R$ {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="px-6 py-4 text-center">
                                  {comprovante ? (
                                    <span className="text-green-600 text-xs font-bold">Anexado</span>
                                  ) : (
                                    <span className="text-gray-300 text-xs">{'\u2014'}</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )
          }

          {
            activeTab === 'rates' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto flex-1">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#FAFBFF] border-b border-gray-100 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider bg-[#FAFBFF]">Veículo / Placa</th>
                        <th className="px-6 py-4 text-xs font-bold text-blue-600 uppercase tracking-wider text-center bg-[#FAFBFF]">Diária (R$)</th>
                        <th className="px-6 py-4 text-xs font-bold text-green-600 uppercase tracking-wider text-center bg-[#FAFBFF]">Taxa por KM (R$)</th>
                        <th className="px-6 py-4 text-xs font-bold text-orange-600 uppercase tracking-wider text-center bg-[#FAFBFF]">Consumo (KM/L)</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center bg-[#FAFBFF]">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-sm text-gray-500">Integração Ticket Log</span>
                        <button
                          onClick={async () => {
                            setIsSyncingTicketLog(true);
                            try {
                              const result = await ticketLogService.syncTicketLogData();
                              addToast(`Sincronização concluída! ${result.count} eventos processados.`, 'success');
                              if (onRefresh) onRefresh();
                            } catch (err) {
                              console.error('Erro na sincronização:', err);
                              addToast('Erro ao sincronizar com Ticket Log', 'error');
                            } finally {
                              setIsSyncingTicketLog(false);
                            }
                          }}
                          disabled={isSyncingTicketLog}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${isSyncingTicketLog ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
                        >
                          <RefreshCw className={`w-4 h-4 ${isSyncingTicketLog ? 'animate-spin' : ''}`} />
                          {isSyncingTicketLog ? 'Sincronizando...' : 'Sincronizar Ticket Log'}
                        </button>
                      </div>
                      {veiculos.map((vehicle) => (
                        <tr key={vehicle.plate} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900">{vehicle.plate}</div>
                            <div className="text-xs text-gray-400">{vehicle.model}</div>
                          </td>
                          <td className="px-6 py-4 text-center font-medium text-gray-600">
                            R$ {Number(vehicle.daily_rate || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-center font-medium text-gray-600">
                            R$ {Number(vehicle.km_rate || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-orange-600">
                            {vehicle.average_consumption ? `${Number(vehicle.average_consumption).toFixed(2)} km/L` : '-'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => openVehicleEditModal(vehicle)}
                              className="flex items-center justify-center gap-1 mx-auto text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
                            >
                              <DollarSign className="w-3 h-3" />
                              Editar Taxas
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          }

          {
            activeTab === 'fleet' && (
              <div className="flex flex-col h-full">
                {/* Legend */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                    <div className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center text-xs font-bold">R</div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-800">Em Rota</span>
                      <span className="text-[10px] text-gray-400">Veículo em movimento</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                    <div className="w-6 h-6 rounded bg-green-500 text-white flex items-center justify-center text-xs font-bold">C</div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-800">Completa Carga</span>
                      <span className="text-[10px] text-gray-400">Veículo completando carga</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                    <div className="w-6 h-6 rounded bg-purple-500 text-white flex items-center justify-center text-xs font-bold">D</div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-800">Disponível</span>
                      <span className="text-[10px] text-gray-400">Finalizado / Pátio</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                    <div className="w-6 h-6 rounded bg-amber-500 text-white flex items-center justify-center text-xs font-bold">P</div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-800">Pernoite</span>
                      <span className="text-[10px] text-gray-400">Parado em pernoite</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                    <div className="w-6 h-6 rounded bg-red-500 text-white flex items-center justify-center text-xs font-bold">O</div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-800">Manutenção</span>
                      <span className="text-[10px] text-gray-400">Oficina / Manutenção</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                    <div className="w-6 h-6 rounded bg-black text-white flex items-center justify-center text-xs font-bold">F</div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-800">Finalizada</span>
                      <span className="text--[10px] text-gray-400">Rota Finalizada</span>
                    </div>
                  </div>
                </div>

                {/* GRID VIEW */}
                {fleetView === 'grid' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
                    {/* Header Row (Days) */}
                    <div className="flex border-b border-gray-200 bg-gray-50">
                      <div className="w-40 flex-shrink-0 p-3 text-xs font-bold text-gray-500 uppercase border-r border-gray-200">
                        Placa
                      </div>
                      <div className="flex-1 flex overflow-x-auto custom-scrollbar">
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                          <div key={day} className="flex-1 min-w-[32px] border-r border-gray-100 p-2 text-center text-xs text-gray-400 font-medium">
                            {day}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Vehicle Rows */}
                    <div className="overflow-y-auto flex-1">
                      {veiculos.map((vehicle, index) => (
                        <div key={vehicle.plate} className="flex border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <div className="w-40 flex-shrink-0 p-3 border-r border-gray-200 bg-white sticky left-0 z-10">
                            <span className="text-sm font-bold text-gray-700 block">{vehicle.plate}</span>
                            <span className="text-[10px] text-gray-400 block truncate" title={vehicle.model}>{vehicle.model}</span>
                          </div>
                          <div className="flex-1 flex">
                            {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                              const year = selectedFleetDate.getFullYear();
                              const month = String(selectedFleetDate.getMonth() + 1).padStart(2, '0');
                              const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;

                              // 1. Check for manual status override
                              const statusObj = dailyStatuses.find(s => s.vehicle_id === vehicle.id && s.date === dateStr);
                              let status = statusObj?.status;

                              // 2. If no manual status, check for active routes
                              if (!status) {
                                const activeRoute = routes.find(r => {
                                  const routeDate = r.date.split('T')[0]; // Assuming ISO string
                                  return r.vehicle_id === vehicle.id &&
                                    routeDate === dateStr;
                                });

                                if (activeRoute) {
                                  if (activeRoute.status === StatusRota.EM_ANDAMENTO) status = 'R'; // Em Rota
                                  else if (activeRoute.status === StatusRota.PERNOITE) status = 'P'; // Pernoite
                                  else if (activeRoute.status === StatusRota.FINALIZADA) status = 'F'; // Finalizada
                                  else if (activeRoute.status === StatusRota.PROBLEMA) status = 'M'; // Manutencao/Problema as Warning
                                }
                              }

                              const getStatusColor = (s: string) => {
                                switch (s) {
                                  case 'R': return 'bg-blue-600 text-white';
                                  case 'C': return 'bg-green-500 text-white';
                                  case 'D': return 'bg-purple-500 text-white';
                                  case 'P': return 'bg-amber-500 text-white';
                                  case 'M': return 'bg-red-500 text-white';
                                  case 'O': return 'bg-red-500 text-white';
                                  case 'F': return 'bg-black text-white';
                                  default: return '';
                                }
                              };

                              return (
                                <div
                                  key={day}
                                  className="flex-1 min-w-[32px] border-r border-gray-100 h-10 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                                  onClick={() => handleCellClick(vehicle.id, day)}
                                >
                                  {status && (
                                    <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${getStatusColor(status)}`}>
                                      {status}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* REPORT VIEW */}
                {fleetView === 'report' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
                    <div className="overflow-auto flex-1">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#FAFBFF] border-b border-gray-100 sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider bg-[#FAFBFF]">Veículo / Placa</th>
                            <th className="px-6 py-4 text-xs font-bold text-blue-600 uppercase tracking-wider text-center bg-[#FAFBFF]">Em Rota (R)</th>
                            <th className="px-6 py-4 text-xs font-bold text-green-600 uppercase tracking-wider text-center bg-[#FAFBFF]">C. Carga (C)</th>
                            <th className="px-6 py-4 text-xs font-bold text-purple-600 uppercase tracking-wider text-center bg-[#FAFBFF]">Disponível (D)</th>
                            <th className="px-6 py-4 text-xs font-bold text-amber-600 uppercase tracking-wider text-center bg-[#FAFBFF]">Pernoite (P)</th>
                            <th className="px-6 py-4 text-xs font-bold text-red-600 uppercase tracking-wider text-center bg-[#FAFBFF]">Manutenção (O)</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider text-center bg-[#FAFBFF]">Finalizada (F)</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-800 uppercase tracking-wider text-center bg-[#FAFBFF] border-l border-gray-100">Total (D+P+C)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {veiculos.map((vehicle, index) => {
                            // Calculate stats from dailyStatuses
                            const vehicleStatuses = dailyStatuses.filter(s => s.vehicle_id === vehicle.id);

                            const emRota = vehicleStatuses.filter(s => s.status === 'R').length;
                            const cCarga = vehicleStatuses.filter(s => s.status === 'C').length;
                            const pernoite = vehicleStatuses.filter(s => s.status === 'P').length;
                            const manutencao = vehicleStatuses.filter(s => s.status === 'M' || s.status === 'O').length;
                            const finalizada = vehicleStatuses.filter(s => s.status === 'F').length;
                            const disponivel = vehicleStatuses.filter(s => s.status === 'D').length;

                            return (
                              <tr key={vehicle.plate} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm font-bold text-gray-900">{vehicle.plate}</span>
                                  <span className="text-xs text-gray-400 block">{vehicle.model}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-blue-600 bg-blue-50/30">{emRota}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-green-600 bg-green-50/30">{cCarga}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-purple-600 bg-purple-50/30">{disponivel}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-amber-600 bg-amber-50/30">{pernoite}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-red-600 bg-red-50/30">{manutencao}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-700 bg-gray-50/30">{finalizada}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-800 bg-gray-100/50 border-l border-gray-100">{disponivel + pernoite + cCarga + finalizada}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          }

          {/* USERS VIEW */}
          {
            activeTab === 'users' && (
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                  <button
                    onClick={() => setUsersTab('drivers')}
                    className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${usersTab === 'drivers' ? 'bg-[#D32F2F] text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                  >
                    <Truck className="w-5 h-5" /> Motoristas
                  </button>
                  <button
                    onClick={() => setUsersTab('shunters')}
                    className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${usersTab === 'shunters' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                  >
                    <Shield className="w-5 h-5" /> Manobristas
                  </button>
                </div>

                {usersTab === 'drivers' ? (
                  <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
                    <DriversView drivers={drivers} onDeleteDriver={onDeleteDriver} />
                  </div>
                ) : (
                  <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {shunters.map(shunter => (
                        <div key={shunter.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative group hover:shadow-md transition-all">
                          <button
                            onClick={() => onDeleteShunter(shunter.id)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg">
                              {shunter.nome.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900">{shunter.nome}</h3>
                              <p className="text-xs text-gray-500">{shunter.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                            <Shield className="w-4 h-4" />
                            <span>Acesso Manobrista</span>
                          </div>
                        </div>
                      ))}
                      {shunters.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                          <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                          <h4 className="text-gray-400 font-bold">Nenhum manobrista cadastrado</h4>
                          <button
                            onClick={() => setIsShunterModalOpen(true)}
                            className="mt-4 text-blue-600 font-bold hover:underline"
                          >
                            Cadastrar o primeiro
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>
      </main>

      {/* Vehicle Edit Modal */}
      {
        isVehicleModalOpen && editingVehicle && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Editar Taxas do Veículo</h3>
                <button onClick={() => setIsVehicleModalOpen(false)} className="text-gray-400 hover:text-gray-600">?</button>
              </div>
              <form onSubmit={handleUpdateVehicle} className="p-6 space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 mb-2">
                  <p><span className="font-bold">{editingVehicle.plate}</span> - {editingVehicle.model}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diária (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full border-gray-300 border rounded-lg p-2"
                    value={editingVehicle.daily_rate}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, daily_rate: parseFloat(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taxa por KM (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full border-gray-300 border rounded-lg p-2"
                    value={editingVehicle.km_rate}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, km_rate: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
                  <p>Estes valores serão utilizados automaticamente no cálculo de receita das rotas.</p>
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">
                  Salvar Alterações
                </button>
              </form>
            </div>
          </div>
        )
      }
      {/* Pernoite Admin Registration Modal */}
      {
        isPernoiteAdminModalOpen && routeForPernoiteExpense && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <Moon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Reg. Despesa Pernoite</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{routeForPernoiteExpense.route_number || `#${routeForPernoiteExpense.id.substring(0, 6)}`}</p>
                  </div>
                </div>
                <button onClick={() => setIsPernoiteAdminModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handlePernoiteExpenseSubmit}>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nome do Hotel</label>
                    <input
                      type="text"
                      required
                      value={pernoiteAdminHotel}
                      onChange={(e) => setPernoiteAdminHotel(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 outline-none font-bold text-gray-900 transition-all"
                      placeholder="Ex: Hotel de Trânsito Seara"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Valor Pago (R$)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={pernoiteAdminCost}
                        onChange={(e) => setPernoiteAdminCost(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 outline-none font-bold text-gray-900 transition-all font-mono"
                        placeholder="0,00"
                      />
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Comprovante / Recibo</label>
                    <label className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-200 border-dashed rounded-xl appearance-none cursor-pointer hover:border-gray-300 focus:outline-none relative overflow-hidden group">
                      {pernoiteAdminReceiptPreview ? (
                        <img src={pernoiteAdminReceiptPreview} alt="Recibo" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                      ) : (
                        <div className="flex flex-col items-center space-y-2">
                          <Camera className="w-6 h-6 text-gray-300 group-hover:text-gray-400 transition-colors" />
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Anexar Comprovante</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" onChange={handlePernoitePhotoChange} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="p-6 bg-gray-50/50 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPernoiteAdminModalOpen(false)}
                    className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl hover:text-gray-900 font-black uppercase text-[10px] tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPernoiteExpense}
                    className="flex-[1.5] py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSavingPernoiteExpense ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Salvar Registro
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
      {/* Route Modal */}
      {
        isRouteModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Nova Rota</h3>
                <button onClick={() => setIsRouteModalOpen(false)} className="text-gray-400 hover:text-gray-600">?</button>
              </div>
              <form onSubmit={handleCreateRoute} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número da Rota</label>
                    <input type="text" required className="w-full border-gray-300 border rounded-lg p-2"
                      value={newRoute.route_number || ''}
                      onChange={(e) => setNewRoute({ ...newRoute, route_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motorista</label>
                    <select
                      className="w-full border-gray-300 border rounded-lg p-2"
                      required
                      value={newRoute.driver_id || ''}
                      onChange={(e) => setNewRoute({ ...newRoute, driver_id: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.nome || (d as any).name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Veículo (Placa)</label>
                    <select
                      className="w-full border-gray-300 border rounded-lg p-2"
                      required
                      value={newRoute.vehicle_id || ''}
                      onChange={(e) => setNewRoute({ ...newRoute, vehicle_id: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {veiculos.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">KM Inicial</label>
                    <input type="number" required className="w-full border-gray-300 border rounded-lg p-2"
                      value={newRoute.initial_km !== undefined ? newRoute.initial_km : ''}
                      onChange={(e) => setNewRoute({ ...newRoute, initial_km: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
                    <input type="text" required className="w-full border-gray-300 border rounded-lg p-2"
                      value={newRoute.origin || ''}
                      onChange={(e) => setNewRoute({ ...newRoute, origin: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
                    <input type="text" required className="w-full border-gray-300 border rounded-lg p-2"
                      value={newRoute.destination || ''}
                      onChange={(e) => setNewRoute({ ...newRoute, destination: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Carga</label>
                    <input type="text" required className="w-full border-gray-300 border rounded-lg p-2"
                      value={newRoute.cargo_type || ''}
                      placeholder="Ex: Seara"
                      onChange={(e) => setNewRoute({ ...newRoute, cargo_type: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Início</label>
                    <input type="date" required className="w-full border-gray-300 border rounded-lg p-2"
                      value={newRoute.date || ''}
                      onChange={(e) => setNewRoute({ ...newRoute, date: e.target.value })}
                    />
                  </div>
                </div>
                <button type="submit" className="w-full bg-[#D32F2F] text-white py-2 rounded-lg font-medium hover:bg-red-700">Criar Rota</button>
              </form>
            </div>
          </div>
        )
      }

      {/* Driver Registration Modal */}
      {
        isDriverModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Novo Motorista</h3>
                <button onClick={() => setIsDriverModalOpen(false)} className="text-gray-400 hover:text-gray-600">?</button>
              </div>
              <form onSubmit={handleCreateDriver} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <input type="text" required className="w-full border-gray-300 border rounded-lg p-2"
                    value={newDriver.nome || ''}
                    onChange={(e) => setNewDriver({ ...newDriver, nome: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (Login)</label>
                  <input type="email" required className="w-full border-gray-300 border rounded-lg p-2"
                    value={newDriver.email || ''}
                    onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input type="tel" required className="w-full border-gray-300 border rounded-lg p-2"
                    value={newDriver.telefone || ''}
                    onChange={(e) => setNewDriver({ ...newDriver, telefone: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modelo do Veículo</label>
                    <input type="text" className="w-full border-gray-300 border rounded-lg p-2"
                      placeholder="Ex: Volvo FH 540"
                      value={newDriver.modeloVeiculo || ''}
                      onChange={(e) => setNewDriver({ ...newDriver, modeloVeiculo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
                    <input type="text" className="w-full border-gray-300 border rounded-lg p-2 uppercase"
                      placeholder="ABC-1234"
                      value={newDriver.placa || ''}
                      onChange={(e) => setNewDriver({ ...newDriver, placa: e.target.value })}
                    />
                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>Uma senha segura será gerada automaticamente após o cadastro.</p>
                </div>

                <button type="submit" className="w-full bg-[#D32F2F] text-white py-2 rounded-lg font-medium hover:bg-red-700 mt-4">Cadastrar Motorista</button>
              </form>
            </div>
          </div>
        )
      }

      {/* Success Credentials Modal */}
      {
        createdDriverCredentials && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden text-center">
              <div className="p-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Motorista Cadastrado com Sucesso!</h3>
                <p className="text-gray-600 mb-6">Envie as credenciais de acesso abaixo para o motorista.</p>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-left space-y-3 mb-6">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Login (Email)</label>
                    <p className="font-mono text-gray-900 font-medium">{createdDriverCredentials.email}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Senha Temporária</label>
                    <div className="flex justify-between items-center">
                      <p className="font-mono text-gray-900 font-bold text-lg">{createdDriverCredentials.password}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setCreatedDriverCredentials(null)}
                  className="w-full bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-800"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Pagamento Avulso Modal */}
      {
        isRequestModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsRequestModalOpen(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">{editingPayment ? 'Editar Registro' : 'Novo Registro'}</h3>
                <button onClick={() => { setIsRequestModalOpen(false); setEditingPayment(null); }} className="text-gray-400 hover:text-gray-600 text-xl">?</button>
              </div>

              {/* Modal Tabs */}
              <div className="flex border-b border-gray-100">
                <button
                  className={`flex-1 py-3 text-sm font-bold transition-colors ${paymentModalTab === 'request' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => !editingPayment && setPaymentModalTab('request')}
                  disabled={!!editingPayment}
                >
                  Solicitação (Motorista)
                </button>
                <button
                  className={`flex-1 py-3 text-sm font-bold transition-colors ${paymentModalTab === 'expense' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => !editingPayment && setPaymentModalTab('expense')}
                  disabled={!!editingPayment}
                >
                  Lançar Despesa
                </button>
              </div>

              {
                paymentModalTab === 'request' ? (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const formData = new FormData(form);
                    const motoristaId = formData.get('motoristaId') as string;
                    const tipo = formData.get('tipo') as 'Adiantamento' | 'Reembolso';
                    const valor = Number(formData.get('valor'));
                    const date = formData.get('date') as string;
                    const descricao = formData.get('descricao') as string;
                    const metodoPagamento = formData.get('metodoPagamento') as any;
                    const file = (formData.get('comprovante') as File);

                    if (!motoristaId || !tipo || !valor || !date) {
                      addToast('Preencha todos os campos obrigatórios.', 'error');
                      return;
                    }

                    let comprovanteUrl = editingPayment?.comprovanteUrl || '';
                    if (file && file.size > 0) {
                      // Start reading file
                      const reader = new FileReader();
                      comprovanteUrl = await new Promise((resolve) => {
                        reader.onload = (e) => resolve(e.target?.result as string);
                        reader.readAsDataURL(file);
                      });
                    }

                    try {
                      if (editingPayment) {
                        await servicoFinanceiro.atualizarSolicitacaoPagamento(editingPayment.id, {
                          motoristaId,
                          tipo,
                          valor,
                          date,
                          descricao,
                          metodoPagamento,
                          comprovanteUrl: comprovanteUrl || undefined,
                        });
                        addToast('Pagamento atualizado com sucesso!', 'success');
                      } else {
                        await servicoFinanceiro.criarSolicitacaoPagamento({
                          motoristaId,
                          tipo,
                          valor,
                          date,
                          descricao,
                          metodoPagamento,
                          comprovanteUrl: comprovanteUrl || undefined,
                        });
                        addToast('Pagamento registrado com sucesso!', 'success');
                      }
                      setIsRequestModalOpen(false);
                      setEditingPayment(null);
                      if (onRefresh) onRefresh();
                    } catch (err) {
                      console.error('Erro ao processar pagamento:', err);
                      addToast('Erro ao processar pagamento.', 'error');
                    }
                  }} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Motorista</label>
                      <select name="motoristaId" className="w-full border-gray-300 border rounded-lg p-2" required defaultValue={editingPayment?.motoristaId || ''}>
                        <option value="">Selecione...</option>
                        {drivers.map(d => <option key={d.id} value={d.id}>{d.nome || d.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pagamento</label>
                        <select name="metodoPagamento" className="w-full border-gray-300 border rounded-lg p-2" required defaultValue={editingPayment?.metodoPagamento || 'PIX'}>
                          <option value="PIX">PIX</option>
                          <option value="OxPay">OxPay</option>
                          <option value="Dinheiro">Dinheiro</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                        <select name="tipo" className="w-full border-gray-300 border rounded-lg p-2" required defaultValue={editingPayment?.tipo || 'Adiantamento'}>
                          <option value="Adiantamento">Adiantamento</option>
                          <option value="Reembolso">Reembolso</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                        <input type="number" name="valor" step="0.01" min="0.01" required className="w-full border-gray-300 border rounded-lg p-2" placeholder="0,00" defaultValue={editingPayment?.valor || ''} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                        <input type="date" name="date" required className="w-full border-gray-300 border rounded-lg p-2" defaultValue={editingPayment?.date ? new Date(editingPayment.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Motivo / Descrição</label>
                      <textarea name="descricao" className="w-full border-gray-300 border rounded-lg p-2" rows={3} placeholder="Ex: Adiantamento para viagem SP-RJ, combustível extra..." defaultValue={editingPayment?.descricao || ''}></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Comprovante {editingPayment ? '(deixe vazio para manter o atual)' : '(opcional)'}</label>
                      <input type="file" name="comprovante" accept="image/*,.pdf" className="w-full border-gray-300 border rounded-lg p-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
                    </div>
                    <button type="submit" className="w-full bg-[#D32F2F] text-white py-2.5 rounded-lg font-bold hover:bg-red-700 transition-colors">
                      {editingPayment ? 'Salvar Alterações' : 'Registrar Pagamento'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    // Manual Expense Entry Logic
                    const expense = { ...newManualExpense };
                    if (!expense.tipo || !expense.valor || !expense.date) {
                      addToast('Preencha os campos obrigatórios (Tipo, Valor, Data).', 'error');
                      return;
                    }
                    if ((expense.tipo === TipoDespesa.MANUTENCAO || expense.tipo === TipoDespesa.LAVAGEM) && !expense.vehicleId) {
                      addToast('Selecione um veículo para despesas de Manutenção/Lavagem.', 'error');
                      return;
                    }
                    if (expense.tipo === TipoDespesa.AVARIA && !expense.motoristaId) {
                      addToast('Selecione um motorista para Avaria de Mercadoria.', 'error');
                      return;
                    }

                    try {
                      let img_url = '';
                      if (manualExpenseReceipt) {
                        img_url = await uploadReceipt(manualExpenseReceipt);
                      }

                      await servicoFinanceiro.criarDespesa({
                        ...expense,
                        valor: Number(expense.valor),
                        rotaId: expense.rotaId || undefined,
                        motoristaId: expense.motoristaId || undefined,
                        vehicleId: expense.vehicleId || undefined,
                        img_url: img_url || undefined
                      } as any);

                      addToast('Despesa lançada com sucesso!', 'success');
                      setIsRequestModalOpen(false);
                      setNewManualExpense({ date: new Date().toISOString().split('T')[0] }); // Reset form
                      setManualExpenseReceipt(null);
                      if (onRefresh) onRefresh();
                    } catch (err) {
                      console.error('Erro ao lançar despesa:', err);
                      addToast('Erro ao salvar despesa.', 'error');
                    }
                  }} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Despesa</label>
                      <select
                        className="w-full border-gray-300 border rounded-lg p-2"
                        value={newManualExpense.tipo || ''}
                        onChange={(e) => setNewManualExpense({ ...newManualExpense, tipo: e.target.value as TipoDespesa })}
                        required
                      >
                        <option value="">Selecione...</option>
                        <option value={TipoDespesa.COMBUSTIVEL}>Combustível</option>
                        <option value={TipoDespesa.PEDAGIO}>Pedágio</option>
                        <option value={TipoDespesa.ALIMENTACAO}>Alimentação</option>
                        <option value={TipoDespesa.MANUTENCAO}>Manutenção</option>
                        <option value={TipoDespesa.LAVAGEM}>Lavagem</option>
                        <option value={TipoDespesa.AVARIA}>Avaria de Mercadoria</option>
                        <option value={TipoDespesa.CHAPA}>Chapa</option>
                        <option value={TipoDespesa.MERCADORIA_PAGA}>Mercadoria Paga</option>
                        <option value={TipoDespesa.PERNOITE_ADMIN}>Pernoite</option>
                        <option value={TipoDespesa.OUTROS}>Outros</option>
                      </select>
                    </div>

                    {(newManualExpense.tipo === TipoDespesa.MANUTENCAO || newManualExpense.tipo === TipoDespesa.LAVAGEM) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Veículo (Placa)</label>
                        <select
                          className="w-full border-gray-300 border rounded-lg p-2"
                          value={newManualExpense.vehicleId || ''}
                          onChange={(e) => setNewManualExpense({ ...newManualExpense, vehicleId: e.target.value })}
                          required
                        >
                          <option value="">Selecione...</option>
                          {veiculos.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>)}
                        </select>
                      </div>
                    )}

                    {newManualExpense.tipo === TipoDespesa.AVARIA && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Motorista</label>
                          <select
                            className="w-full border-gray-300 border rounded-lg p-2"
                            value={newManualExpense.motoristaId || ''}
                            onChange={(e) => setNewManualExpense({ ...newManualExpense, motoristaId: e.target.value })}
                            required
                          >
                            <option value="">Selecione...</option>
                            {drivers.map(d => <option key={d.id} value={d.id}>{d.nome || d.name}</option>)}
                          </select>
                        </div>
                        {/* Optional Route Selection - simplified as text or unimplemented for now since routes list might be large */}
                        {/* Ideally would be a search or dropdown of recent routes */}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          className="w-full border-gray-300 border rounded-lg p-2"
                          placeholder="0,00"
                          value={newManualExpense.valor || ''}
                          onChange={(e) => setNewManualExpense({ ...newManualExpense, valor: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                        <input
                          type="date"
                          required
                          className="w-full border-gray-300 border rounded-lg p-2"
                          value={newManualExpense.date || ''}
                          onChange={(e) => setNewManualExpense({ ...newManualExpense, date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                      <textarea
                        className="w-full border-gray-300 border rounded-lg p-2"
                        rows={3}
                        placeholder="Detalhes do custo..."
                        value={newManualExpense.observacoes || ''}
                        onChange={(e) => setNewManualExpense({ ...newManualExpense, observacoes: e.target.value })}
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Comprovante / Foto</label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setManualExpenseReceipt(e.target.files[0]);
                          }
                        }}
                        className="w-full border-gray-300 border rounded-lg p-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                      />
                    </div>

                    <button type="submit" className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-bold hover:bg-purple-700 transition-colors">
                      Lançar Despesa
                    </button>
                  </form>
                )
              }
            </div>
          </div>
        )
      }

      {/* Payment Detail Popup */}
      {
        selectedPayment && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPayment(null)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Detalhes do Pagamento</h3>
                <button onClick={() => setSelectedPayment(null)} className="text-gray-400 hover:text-gray-600 text-xl">?</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Motorista</p>
                    <p className="text-sm font-medium text-gray-900">{selectedPayment._driver?.nome || selectedPayment._driver?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Método</p>
                    {selectedPayment._metodo ? (
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${selectedPayment._metodo === 'PIX' ? 'bg-green-50 text-green-700' :
                        selectedPayment._metodo === 'OxPay' ? 'bg-blue-50 text-blue-700' :
                          selectedPayment._metodo === 'Dinheiro' ? 'bg-amber-50 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                        }`}>{selectedPayment._metodo}</span>
                    ) : (
                      <p className="text-sm text-gray-400">{'\u2014'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Categoria</p>
                    <p className="text-sm font-medium text-gray-900">{selectedPayment._tipo}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Valor</p>
                    <p className="text-sm font-bold text-green-700">R$ {Number(selectedPayment._valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Data</p>
                    <p className="text-sm text-gray-900">{new Date(selectedPayment.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                {selectedPayment._descricao && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Motivo / Descrição</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedPayment._descricao}</p>
                  </div>
                )}
                {selectedPayment._comprovante && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Comprovante</p>
                    {selectedPayment._comprovante.startsWith('data:image') && (
                      <img src={selectedPayment._comprovante} alt="Comprovante" className="w-full rounded-lg border border-gray-200 max-h-[300px] object-contain mb-3" />
                    )}
                    <a
                      href={selectedPayment._comprovante}
                      download={`comprovante_${new Date(selectedPayment.date).toLocaleDateString('pt-BR').replace(/\//g, '-')}`}
                      className="inline-flex items-center gap-2 w-full justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm py-2.5 px-4 rounded-lg border border-blue-200 transition-colors"
                    >
                      <Download className="w-4 h-4" /> Baixar Comprovante
                    </a>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button
                  onClick={() => {
                    setEditingPayment(selectedPayment);
                    setIsRequestModalOpen(true);
                    setSelectedPayment(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-blue-600 font-bold text-sm py-2.5 px-4 rounded-lg border border-blue-200 transition-colors"
                >
                  <Edit2 className="w-4 h-4" /> Editar
                </button>
                <button
                  onClick={() => handleDeletePayment(selectedPayment.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-600 font-bold text-sm py-2.5 px-4 rounded-lg border border-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Route Details Modal */}
      {
        selectedRoute && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{isEditingRoute ? 'Editar Rota' : 'Detalhes da Rota'}</h3>
                  <p className="text-sm text-gray-500 font-mono">{selectedRoute.route_number || `#${selectedRoute.id.substring(0, 8)}`}</p>
                </div>
                <div className="flex gap-2">
                  {!isEditingRoute ? (
                    <button
                      onClick={() => {
                        setEditedRouteData(selectedRoute);
                        setIsEditingRoute(true);
                      }}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-100 transition-colors"
                    >
                      Editar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setIsEditingRoute(false);
                          setEditedRouteData({});
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-200 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveRouteDetails}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors"
                      >
                        Salvar
                      </button>
                    </>
                  )}
                  <button onClick={() => { setSelectedRoute(null); setIsEditingRoute(false); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-8">
                {/* General Info & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Informações Gerais</h4>
                      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Status</span>
                          {isEditingRoute ? (
                            <select
                              className="bg-white border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1"
                              value={editedRouteData.status || selectedRoute.status}
                              onChange={(e) => setEditedRouteData({ ...editedRouteData, status: e.target.value as StatusRota })}
                            >
                              {Object.values(StatusRota).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${selectedRoute.status === StatusRota.FINALIZADA ? 'bg-green-100 text-green-700' :
                              selectedRoute.status === StatusRota.EM_ANDAMENTO ? 'bg-blue-100 text-blue-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>{selectedRoute.status}</span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Data Início</span>
                          {isEditingRoute ? (
                            <input
                              type="date"
                              className="bg-white border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1"
                              value={editedRouteData.date ? new Date(editedRouteData.date).toISOString().split('T')[0] : (selectedRoute.date ? new Date(selectedRoute.date).toISOString().split('T')[0] : '')}
                              onChange={(e) => setEditedRouteData({ ...editedRouteData, date: e.target.value })}
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-900">{new Date(selectedRoute.date).toLocaleDateString('pt-BR')}</span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Data Finalização</span>
                          {isEditingRoute ? (
                            <input
                              type="date"
                              className="bg-white border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1"
                              value={editedRouteData.final_date ? new Date(editedRouteData.final_date).toISOString().split('T')[0] : (selectedRoute.final_date ? new Date(selectedRoute.final_date).toISOString().split('T')[0] : '')}
                              onChange={(e) => setEditedRouteData({ ...editedRouteData, final_date: e.target.value })}
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-900">{selectedRoute.final_date ? new Date(selectedRoute.final_date).toLocaleDateString('pt-BR') : '-'}</span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Motorista</span>
                          {isEditingRoute ? (
                            <select
                              className="bg-white border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1 w-48"
                              value={editedRouteData.driver_id || selectedRoute.driver_id || ''}
                              onChange={(e) => setEditedRouteData({ ...editedRouteData, driver_id: e.target.value })}
                            >
                              <option value="">Selecione...</option>
                              {drivers.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                            </select>
                          ) : (
                            <span className="text-sm font-medium text-gray-900">{drivers.find(d => d.id === selectedRoute.driver_id)?.nome || selectedRoute.original_driver_name || 'N/A'}</span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Veículo</span>
                          {isEditingRoute ? (
                            <select
                              className="bg-white border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1 w-48"
                              value={editedRouteData.vehicle_id || selectedRoute.vehicle_id || ''}
                              onChange={(e) => setEditedRouteData({ ...editedRouteData, vehicle_id: e.target.value })}
                            >
                              <option value="">Selecione...</option>
                              {veiculos.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>)}
                            </select>
                          ) : (
                            <span className="text-sm font-medium text-gray-900">{
                              (() => {
                                const v = veiculos.find(v => v.id === selectedRoute.vehicle_id);
                                return v ? `${v.plate} (${v.model})` : (drivers.find(d => d.id === selectedRoute.driver_id)?.placa || 'N/A');
                              })()
                            }</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Trajeto</h4>
                      <div className="bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <div className="space-y-4 relative z-10 pl-2">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Origem</p>
                            {isEditingRoute ? (
                              <input
                                type="text"
                                className="w-full border-gray-300 border rounded p-1 text-sm font-bold text-gray-900"
                                value={editedRouteData.origin !== undefined ? editedRouteData.origin : selectedRoute.origin}
                                onChange={(e) => setEditedRouteData({ ...editedRouteData, origin: e.target.value })}
                              />
                            ) : (
                              <p className="font-bold text-gray-900 text-lg">{selectedRoute.origin}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-400">KM Inicial:</p>
                              {isEditingRoute ? (
                                <input
                                  type="number"
                                  className="border-gray-300 border rounded p-0.5 text-sm font-medium w-24"
                                  value={editedRouteData.initial_km !== undefined ? editedRouteData.initial_km : selectedRoute.initial_km}
                                  onChange={(e) => setEditedRouteData({ ...editedRouteData, initial_km: Number(e.target.value) })}
                                />
                              ) : (
                                <span className="text-gray-900 font-mono font-medium">{selectedRoute.initial_km?.toLocaleString('pt-BR') || '-'}</span>
                              )}
                            </div>
                          </div>
                          <div className="w-full h-px bg-gray-100 my-2"></div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Destino</p>
                            {isEditingRoute ? (
                              <input
                                type="text"
                                className="w-full border-gray-300 border rounded p-1 text-sm font-bold text-gray-900"
                                value={editedRouteData.destination !== undefined ? editedRouteData.destination : selectedRoute.destination}
                                onChange={(e) => setEditedRouteData({ ...editedRouteData, destination: e.target.value })}
                              />
                            ) : (
                              <p className="font-bold text-gray-900 text-lg">{selectedRoute.destination}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-400">KM Final:</p>
                              {isEditingRoute ? (
                                <input
                                  type="number"
                                  className="border-gray-300 border rounded p-0.5 text-sm font-medium w-24"
                                  value={editedRouteData.final_km !== undefined ? (editedRouteData.final_km || '') : (selectedRoute.final_km || '')}
                                  onChange={(e) => setEditedRouteData({ ...editedRouteData, final_km: Number(e.target.value) })}
                                />
                              ) : (
                                <span className="text-gray-900 font-mono font-medium">{selectedRoute.final_km?.toLocaleString('pt-BR') || '-'}</span>
                              )}
                            </div>
                          </div>
                          <div className="w-full h-px bg-gray-100 my-2"></div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1 animate-flash-orange-text">KM Final Seara</p>
                            <div className="flex items-center gap-2 mt-1">
                              {isEditingRoute ? (
                                <input
                                  type="number"
                                  className="border-gray-300 border rounded p-0.5 text-sm font-medium w-24 animate-flash-orange-box"
                                  value={editedRouteData.km_final_seara !== undefined ? (editedRouteData.km_final_seara || '') : (selectedRoute.km_final_seara || '')}
                                  onChange={(e) => setEditedRouteData({ ...editedRouteData, km_final_seara: Number(e.target.value) })}
                                />
                              ) : (
                                <span className="text-gray-900 font-mono font-medium">{selectedRoute.km_final_seara?.toLocaleString('pt-BR') || '-'}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Resumo Financeiro</h4>
                      {(() => {
                        // Revenue Calculation: km_final_seara * km_rate_da_placa + diaria_da_placa
                        let calculatedRevenue = 0;
                        const vehicle = veiculos.find(v => v.id === selectedRoute.vehicle_id);
                        if (vehicle) {
                          const kmFinalSeara = Number(selectedRoute.km_final_seara) || 0;
                          calculatedRevenue = (kmFinalSeara * Number(vehicle.km_rate || 0)) + Number(vehicle.daily_rate || 0);
                        }

                        // Expenses (exclude Descarga u00e9 reembols�vel)
                        const routeExpenses = expenses.filter(e => e.rotaId === selectedRoute.id)
                          .filter(e => e.tipo !== TipoDespesa.DESCARGA);

                        const totalExpenses = routeExpenses.reduce((sum, e) => sum + (Number(e.valor) || 0), 0);

                        const profit = calculatedRevenue - totalExpenses;

                        return (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                              <p className="text-xs text-blue-600 mb-1 font-bold uppercase">Receita Total</p>
                              <p className="text-xl font-bold text-blue-700">R$ {calculatedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              {vehicle && <p className="text-[10px] text-blue-400 mt-1">(KM * {vehicle.km_rate}) + {vehicle.daily_rate}</p>}
                            </div>
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                              <p className="text-xs text-red-600 mb-1 font-bold uppercase">Despesas</p>
                              <p className="text-xl font-bold text-red-700">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <div className="col-span-2 bg-gray-900 p-5 rounded-xl text-white shadow-lg shadow-gray-200">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-xs text-gray-400 mb-1 font-bold uppercase">Lucro L�quido</p>
                                  <p className={`text-3xl font-bold ${profit < 0 ? 'text-red-400' : 'text-white'}`}>
                                    R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                </div>
                                <TrendingUp className={`w-8 h-8 ${profit < 0 ? 'text-red-400' : 'text-green-400'} opacity-80`} />
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Canhoto */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Comprovante de Descarga</h4>
                    {(() => {
                      const descargaExpense = expenses.find(e => e.rotaId === selectedRoute.id && e.tipo === TipoDespesa.DESCARGA);
                      const hasDescarga = !!descargaExpense;

                      // Check if we have synced data from Ravex
                      const syncedData = ravexCosts[selectedRoute.id];
                      const custoAdicional = syncedData ? syncedData.custoAdicional : 0;
                      const valorSolicitado = syncedData ? syncedData.valorSolicitado : (descargaExpense ? descargaExpense.valor : 0);

                      return (
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col gap-2 mb-3">
                          <div className="p-3 pb-0 border-b border-gray-100 flex justify-between items-center pb-2">
                            <span className="text-xs font-bold text-gray-500">ID: <span className="text-gray-900 font-mono tracking-tight">{selectedRoute.route_number || selectedRoute.id.split('-')[0]}</span></span>
                            {hasDescarga ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 uppercase tracking-wide">
                                <CheckCircle2 className="w-3 h-3" /> Descarga Lançada
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase tracking-wide">
                                <XCircle className="w-3 h-3" /> Não Teve Descarga
                              </span>
                            )}
                          </div>

                          <div className="p-3 pt-1 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Custo Adicional (Ravex)</span>
                              <span className="text-sm font-bold text-gray-900">R$ {custoAdicional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex flex-col text-right">
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Valor Solicitado</span>
                              <span className={`text-sm font-bold ${hasDescarga ? 'text-blue-600' : 'text-gray-400'}`}>R$ {valorSolicitado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>

                          <div className="bg-gray-50 p-2 rounded-b-xl border-t border-gray-100 flex justify-end">
                            <button
                              onClick={handleSyncRavex}
                              disabled={isSyncingRavex}
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
                            >
                              {isSyncingRavex ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" /> Verificando Ravex...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3 h-3" /> Sincronizar Ravex
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                    {selectedRoute.unloading_photo_url ? (
                      <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden group cursor-pointer border border-gray-200 shadow-sm" onClick={() => window.open(selectedRoute.unloading_photo_url, '_blank')}>
                        <img src={selectedRoute.unloading_photo_url} alt="Comprovante" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white font-medium flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full"><ExternalLink className="w-4 h-4" /> Visualizar</span>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                        <Camera className="w-8 h-8 mb-2 opacity-30" />
                        <span className="text-sm font-medium">Nenhum comprovante anexado</span>
                      </div>
                    )}
                  </div>

                  {/* Sobra (Leftover) Photo */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Sobra de Mercadoria</h4>
                    {selectedRoute.leftover_photo_url ? (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedRoute.leftover_photo_url.split(',').map((url, idx) => (
                          <div key={idx} className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden group cursor-pointer border border-orange-200 shadow-sm" onClick={() => window.open(url.trim(), '_blank')}>
                            <img src={url.trim()} alt={`Sobra ${idx + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-white font-medium flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-[10px]"><ExternalLink className="w-3 h-3" /> Ver</span>
                            </div>
                            {idx === 0 && <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-orange-500 text-white text-[8px] font-black uppercase rounded shadow-sm">Tem Sobra</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                        <Truck className="w-8 h-8 mb-2 opacity-30" />
                        <span className="text-sm font-medium">Nenhuma sobra registrada</span>
                      </div>
                    )}
                  </div>

                  {/* Expenses List */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Detalhamento de Despesas</h4>
                      {(isEditingRoute || isAddingExpense) && !isAddingExpense && (
                        <button
                          onClick={() => setIsAddingExpense(true)}
                          className="px-3 py-1 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Adicionar Despesa
                        </button>
                      )}
                    </div>

                    {isAddingExpense && (
                      <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex gap-4 items-end">
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-red-400 uppercase mb-1">Tipo</label>
                            <select
                              className="w-full border-red-200 border rounded-lg p-2 text-sm bg-white focus:ring-red-500 focus:border-red-500"
                              value={newExpense.tipo}
                              onChange={(e) => setNewExpense({ ...newExpense, tipo: e.target.value })}
                            >
                              <option value="">Selecione...</option>
                              {Object.values(TipoDespesa).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div className="w-32">
                            <label className="block text-xs font-bold text-red-400 uppercase mb-1">Valor (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              className="w-full border-red-200 border rounded-lg p-2 text-sm focus:ring-red-500 focus:border-red-500"
                              value={newExpense.valor}
                              onChange={(e) => setNewExpense({ ...newExpense, valor: e.target.value })}
                            />
                          </div>
                          {newExpense.tipo === TipoDespesa.COMBUSTIVEL && (
                            <div className="w-24">
                              <label className="block text-xs font-bold text-red-400 uppercase mb-1">Litros</label>
                              <input
                                type="number"
                                step="0.01"
                                className="w-full border-red-200 border rounded-lg p-2 text-sm focus:ring-red-500 focus:border-red-500"
                                value={newExpense.litros || ''}
                                onChange={(e) => setNewExpense({ ...newExpense, litros: e.target.value })}
                                placeholder="0.00"
                              />
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={handleAddExpense}
                              disabled={!newExpense.tipo || !newExpense.valor}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => setIsAddingExpense(false)}
                              className="px-4 py-2 bg-white text-gray-500 border border-gray-200 rounded-lg font-bold text-xs hover:bg-gray-50 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {expenses.filter(e => e.rotaId === selectedRoute.id).length > 0 ? (
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Tipo</th>
                              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Valor</th>
                              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Comprovante</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(() => {
                              const routeExpenses = expenses.filter(e => e.rotaId === selectedRoute.id);
                              const seen = new Set<string>();
                              return routeExpenses.filter(exp => {
                                // Deduplicate logic
                                const val = Number(exp.valor).toFixed(2);
                                const key = `${exp.tipo}-${val}`;
                                if (seen.has(key)) return false;
                                seen.add(key);
                                return true;
                              }).map(exp => (
                                <tr
                                  key={exp.id}
                                  className={`hover:bg-gray-50 transition-colors ${exp.img_url && !isEditingRoute ? 'cursor-pointer' : ''}`}
                                  onClick={() => !isEditingRoute && exp.img_url && window.open(exp.img_url, '_blank')}
                                >
                                  <td className="px-4 py-3 font-medium text-gray-900">
                                    {isEditingRoute ? (
                                      <select
                                        className="bg-white border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1"
                                        value={exp.tipo}
                                        onChange={(e) => handleUpdateExpenseTipo(exp.id, e.target.value as TipoDespesa)}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {Object.values(TipoDespesa).map(t => <option key={t} value={t}>{t}</option>)}
                                      </select>
                                    ) : (
                                      <>
                                        {exp.tipo}
                                        {exp.tipo === TipoDespesa.DESCARGA && (
                                          <span className="ml-2 text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                                            Despesa reembols�vel
                                          </span>
                                        )}
                                      </>
                                    )}
                                    <div className="text-[10px] text-gray-400 font-normal">{new Date(exp.date).toLocaleDateString('pt-BR')}</div>
                                  </td>
                                  <td className="px-4 py-3 font-bold text-red-600">R$ {Number(exp.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="px-4 py-3 text-right">
                                    {exp.img_url ? (
                                      <div className="text-blue-600 p-1 rounded inline-block" title="Ver anexo">
                                        <Paperclip className="w-4 h-4" />
                                      </div>
                                    ) : <span className="text-gray-300">-</span>}
                                  </td>
                                </tr>
                              ))
                            })()}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-8 text-center border border-dashed border-gray-200">
                        <p className="text-gray-500 text-sm">Nenhuma despesa lan�ada.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
                  <button
                    onClick={() => setSelectedRoute(null)}
                    className="px-6 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
      {/* Status Edit Modal */}
      {
        isStatusModalOpen && editingStatus && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">
                  Editar Status
                </h3>
                <button onClick={() => setIsStatusModalOpen(false)} className="text-gray-400 hover:text-gray-600">?</button>
              </div>
              <div className="p-6">
                <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-400 uppercase">Ve�culo</span>
                    <span className="text-xs font-bold text-gray-400 uppercase">Data</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-lg">{veiculos.find(v => v.id === editingStatus.vehicleId)?.plate}</span>
                    <span className="font-medium text-gray-700">{new Date(editingStatus.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { code: 'R', label: 'Em Rota', color: 'bg-blue-600' },
                    { code: 'C', label: 'Completa Carga', color: 'bg-green-500' },
                    { code: 'D', label: 'Dispon�vel', color: 'bg-purple-500' },
                    { code: 'P', label: 'Pernoite', color: 'bg-amber-500' },
                    { code: 'O', label: 'Manutenu00e7u00e3o', color: 'bg-red-500' },
                    { code: 'F', label: 'Finalizada', color: 'bg-black' }
                  ].map(option => (
                    <button
                      key={option.code}
                      onClick={() => handleSaveStatus(option.code, option.label)}
                      className={`p-3 rounded-xl border-2 text-left transition-all group hover:shadow-md ${editingStatus.currentStatus === option.code
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 ring-offset-1'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-white'
                        }`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${option.color} text-white flex items-center justify-center font-bold mb-2 shadow-sm group-hover:scale-110 transition-transform`}>
                        {option.code}
                      </div>
                      <div className="text-sm font-bold text-gray-700">{option.label}</div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleSaveStatus('', '')}
                  className="w-full mt-6 py-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                >
                  Remover Status
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Shunter Registration Modal */}
      {
        isShunterModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Novo Manobrista</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cadastro de Acesso</p>
                  </div>
                </div>
                <button onClick={() => { setIsShunterModalOpen(false); setCreatedShunterCredentials(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateShunter}>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={newShunter.nome || ''}
                      onChange={(e) => setNewShunter({ ...newShunter, nome: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 outline-none font-bold text-gray-900 transition-all"
                      placeholder="Nome do manobrista"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">E-mail (Login)</label>
                    <input
                      type="email"
                      required
                      value={newShunter.email || ''}
                      onChange={(e) => setNewShunter({ ...newShunter, email: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 outline-none font-bold text-gray-900 transition-all font-mono"
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Senha de Acesso</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={newShunter.password || ''}
                        onChange={(e) => setNewShunter({ ...newShunter, password: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 outline-none font-bold text-gray-900 transition-all font-mono"
                        placeholder="Senha provis�ria"
                      />
                      <button
                        type="button"
                        onClick={() => setNewShunter({ ...newShunter, password: Math.random().toString(36).slice(-8) })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700"
                      >
                        Gerar
                      </button>
                    </div>
                  </div>

                  {createdShunterCredentials && (
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100 mt-4 animate-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 text-green-700 font-bold text-xs mb-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Credenciais Geradas!</span>
                      </div>
                      <div className="space-y-1 text-[10px] font-medium text-green-600">
                        <p><strong>Login:</strong> {createdShunterCredentials.email}</p>
                        <p><strong>Senha:</strong> {createdShunterCredentials.password}</p>
                      </div>
                      <p className="text-[10px] text-green-500 mt-2 italic font-bold">Importante: Copie e salve os dados antes de fechar!</p>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-gray-50/50 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsShunterModalOpen(false); setCreatedShunterCredentials(null); }}
                    className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl hover:text-gray-900 font-black uppercase text-[10px] tracking-widest transition-all"
                  >
                    Fechar
                  </button>
                  {!createdShunterCredentials && (
                    <button
                      type="submit"
                      className="flex-[1.5] py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Cadastrar Manobrista
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div>
  );
};

export default AdminPanel;
