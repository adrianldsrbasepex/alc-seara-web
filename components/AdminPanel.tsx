// Developer: Adrian Luciano De Sena Ribeiro - MG | Tel: 31 995347802
import React, { useState, useEffect, useRef } from 'react';
import { Rota, Despesa, Motorista, StatusRota, EstatisticasPainel, TipoDespesa, SolicitacaoPagamento, StatusSolicitacao, TipoUsuario, VehicleDailyStatus } from '../types';
import {
  LayoutDashboard, Map, Users, Wallet, LogOut,
  Plus, Search, Filter, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle2, Factory, Truck, FileText, Moon,
  Download, Upload, RefreshCw, Trash2, Calendar, Activity, ChevronLeft, ChevronRight, DollarSign,
  X, ExternalLink, Camera, Paperclip, Save, Receipt
} from 'lucide-react';
import { uploadReceipt } from '../lib/uploadReceipt';
import { servicoFrota, Veiculo } from '../services/fleetService';
import { servicoFinanceiro } from '../services/financialService';
import { servicoRota } from '../services/routeService';
import { DriversView } from './DriversView';
import { Toast, ToastContainer, ToastType } from './Toast';

import { ClosureTable, MergedClosureRow } from './ClosureTable';
import { ClosureData, spreadsheetService, RouteImportData } from '../services/spreadsheetService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FinancialClosure } from '../types';

interface AdminPanelProps {
  routes: Rota[];
  drivers: Motorista[];
  expenses: Despesa[];
  veiculos: Veiculo[];
  solicitacoes: SolicitacaoPagamento[];
  onAddRoute: (route: Omit<Rota, 'id'>) => void;
  onAddDriver: (driver: Omit<Motorista, 'id'>) => void;
  onDeleteDriver: (id: string) => void;
  onLogout: () => void;
  onRefresh?: () => void;
}

const COLORS = ['#3b82f6', '#fbbf24', '#ef4444', '#10b981', '#8b5cf6'];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  routes,
  drivers,
  expenses,
  veiculos,
  solicitacoes,
  onAddRoute,
  onAddDriver,
  onDeleteDriver,
  onLogout,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'routes' | 'financial' | 'drivers' | 'fleet' | 'requests' | 'rates'>('dashboard');
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
      addToast('Veículo atualizado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar veículo:', error);
      addToast('Erro ao atualizar veículo', 'error');
    }
  };

  const openVehicleEditModal = (vehicle: Veiculo) => {
    setEditingVehicle(vehicle);
    setIsVehicleModalOpen(true);
  };

  const [newRequest, setNewRequest] = useState<Partial<SolicitacaoPagamento>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);

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

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        addToast('Nenhum dado válido encontrado.', 'error');
        return;
      }

      // Transform raw ClosureData into MergedClosureRow immediately
      const newRows: MergedClosureRow[] = data.map(item => {
        // Find route by strict match between DB route_number and Excel Identificador (Column D)
        const route = routes.find(r =>
          r.route_number &&
          String(r.route_number).trim().toLowerCase() === String(item.route_number).trim().toLowerCase()
        );

        let vehicle: Veiculo | undefined;
        let km_real = 0;
        let status: MergedClosureRow['status'] = 'Ok';

        if (route) {
          // Find vehicle
          if (route.vehicle_id) {
            vehicle = veiculos.find(v => v.id === route.vehicle_id); // Use veiculos state here
          } else if (route.driver_id) {
            // Try to find vehicle by driver's plate if vehicle_id is missing
            // (Optional fallback logic derived from previous implementation)
            const driver = drivers.find(d => d.id === route.driver_id);
            if (driver?.placa) {
              vehicle = veiculos.find(v => v.plate === driver.placa);
            }
          }

          if (route.final_km && route.initial_km) {
            km_real = route.final_km - route.initial_km;
          }

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
          descarga: item.total_gross_value,
          daily_rate: vehicle?.daily_rate || 0,
          val_km_seara: 0,
          val_km_perdido: 0,
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

  const handleSaveRouteDetails = async () => {
    if (!selectedRoute) return;

    try {
      await servicoRota.atualizarRota(selectedRoute.id, editedRouteData);

      if (onRefresh) onRefresh();

      // Optimistic update for modal
      setSelectedRoute(prev => prev ? ({ ...prev, ...editedRouteData }) : null);

      setIsEditingRoute(false);
      setEditedRouteData({});
      addToast('Rota atualizada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar rota:', error);
      addToast('Erro ao atualizar rota', 'error');
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
        date: new Date().toISOString(),
        observacoes: 'Adicionado via Painel Admin',
        img_url: ''
      });

      if (onRefresh) onRefresh();

      // We can't easily optimistic update expenses prop since it's from parent
      // But we can show success message

      setIsAddingExpense(false);
      setNewExpense({ tipo: '', valor: '' });
      addToast('Despesa adicionada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
      addToast('Erro ao adicionar despesa', 'error');
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
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [editedRouteData, setEditedRouteData] = useState<Partial<Rota>>({});
  const [newExpense, setNewExpense] = useState<{ tipo: string, valor: string }>({ tipo: '', valor: '' });
  const [isAddingExpense, setIsAddingExpense] = useState(false);

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
  });

  // Calculate expenses related to the filtered routes
  const filteredRouteIds = new Set(filteredRoutes.map(r => r.id));
  const filteredExpenses = expenses.filter(e => filteredRouteIds.has(e.rotaId));

  // Helper to calculate revenue dynamically
  const calculateRouteRevenue = (route: Rota) => {
    // If we have no KM data, we at least check for daily rate if just initiated? 
    // Usually revenue depends on movement. User said: "diarias ... + km * km metrificado"

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

    const days = 1; // Assuming 1 daily rate per route entry for now, or based on date diff? 
    // "soma de todas as diarias" -> implies 1 daily rate per trip usually.

    let kmRevenue = 0;
    if (route.final_km && route.initial_km) {
      const kmRodados = Math.max(0, route.final_km - route.initial_km);
      kmRevenue = kmRodados * vehicle.km_rate;
    }

    return vehicle.daily_rate + kmRevenue;
  };

  const formattedStats = {
    rotasAtivas: filteredRoutes.filter(r => r.status === StatusRota.EM_ANDAMENTO).length,
    rotasFinalizadas: filteredRoutes.filter(r => r.status === StatusRota.FINALIZADA).length,
    rotasPernoite: filteredRoutes.filter(r => r.status === StatusRota.PERNOITE).length,
    problemas: filteredRoutes.filter(r => r.status === StatusRota.PROBLEMA).length,
    // Use the dynamic calculation
    receitaTotal: filteredRoutes.reduce((acc, r) => acc + calculateRouteRevenue(r), 0),
    despesasTotal: filteredExpenses.reduce((acc, e) => acc + (e.valor || 0), 0),
    lucroLiquido: 0
  };
  formattedStats.lucroLiquido = formattedStats.receitaTotal - formattedStats.despesasTotal;

  // Update the stats reference used in render
  const stats = formattedStats;

  // Driver Performance Data
  const driverPerformance = drivers.map(driver => {
    const driverRoutes = filteredRoutes.filter(r => r.driver_id === driver.id);
    const driverExpenses = expenses.filter(e => e.motoristaId === driver.id);

    const revenue = driverRoutes.reduce((acc, r) => acc + calculateRouteRevenue(r), 0);
    const cost = driverExpenses.reduce((acc, e) => acc + (e.valor || 0), 0);
    const profit = revenue - cost;

    const totalKmVal = driverRoutes.reduce((acc, r) => {
      if (r.final_km && r.initial_km) return acc + (r.final_km - r.initial_km);
      return acc;
    }, 0);

    return {
      id: driver.id,
      name: driver.nome,
      routesCount: driverRoutes.length,
      totalKm: `${totalKmVal} km`,
      revenue,
      profit
    };
  }).filter(d => d.routesCount > 0).sort((a, b) => b.profit - a.profit);

  // Chart Data
  const statusData = [
    { name: 'Finalizadas', value: stats.rotasFinalizadas, color: '#3b82f6' },
    { name: 'Pernoite', value: stats.rotasPernoite, color: '#fbbf24' },
    { name: 'Em Andamento', value: stats.rotasAtivas, color: '#9ca3af' },
  ];

  // Financial Chart Data (Frete Total - Last 6 Months)
  const financialBarData = (() => {
    const data = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = d.toISOString().slice(0, 7); // YYYY-MM
      const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();

      const total = routes
        .filter(r => r.date && r.date.startsWith(monthKey))
        .reduce((sum, r) => sum + calculateRouteRevenue(r), 0);

      data.push({ name: monthLabel, value: total });
    }
    return data;
  })();

  // Financial Pie Data (Canhotos)
  const financialPieData = (() => {
    const withCanhoto = routes.filter(r => r.unloading_photo_url).length;
    const withoutCanhoto = routes.length - withCanhoto;
    return [
      { name: 'Sim', value: withCanhoto, color: '#0F172A' },
      { name: 'Não', value: withoutCanhoto, color: '#991B1B' }
    ];
  })();

  // Forms State
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [newRoute, setNewRoute] = useState<Partial<Rota>>({ status: StatusRota.PENDENTE });

  // Driver Registration State
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [newDriver, setNewDriver] = useState<Partial<Motorista>>({});
  const [createdDriverCredentials, setCreatedDriverCredentials] = useState<{ email: string, password: string } | null>(null);

  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDriver.name && newDriver.email && newDriver.phone) {
      // Mock Password Generation
      const password = Math.random().toString(36).slice(-8);

      onAddDriver({
        nome: newDriver.name!,
        email: newDriver.email!,
        telefone: newDriver.phone!,
        placa: newDriver.licensePlate || '',
        modeloVeiculo: newDriver.vehicleModel || '',
        tipo: 'MOTORISTA' as TipoUsuario,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newDriver.name!)}&background=random`
      });

      setCreatedDriverCredentials({
        email: newDriver.email,
        password: password
      });

      setIsDriverModalOpen(false);
      setNewDriver({});
      addToast('Motorista cadastrado com sucesso!', 'success');
    }
  };

  const dashboardFileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoute.origin && newRoute.destination && newRoute.driverId) {
      onAddRoute({
        driver_id: newRoute.driver_id,
        origin: newRoute.origin,
        destination: newRoute.destination,
        date: newRoute.date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
        status: StatusRota.PENDENTE,
        cargo_type: newRoute.cargo_type || 'Geral',
        estimated_revenue: Number(newRoute.estimated_revenue) || 0,
        description: newRoute.description
      });
      setIsRouteModalOpen(false);
      setNewRoute({});
      addToast('Nova rota iniciada com sucesso!', 'success');
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
          await servicoRota.atualizarRota(existing.id, {
            status: status,
            initial_km: item.initial_km,
            final_km: item.final_km > 0 ? item.final_km : undefined,
            estimated_revenue: revenue,
            vehicle_id: vehicle.id,
            driver_id: driverId ? driverId : existing.driver_id, // Keep existing if update doesn't find one? Or update to null? Better keep existing.
            // If we didn't find a driver now, but one existed, keep it. If none existed, still none.
          });

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
                  valor: 0,
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

          const newRoute = await servicoRota.criarRota({
            driver_id: driverId || null, // Allow null
            vehicle_id: vehicle.id,
            route_number: item.route_number,
            origin: 'Seara - Bebedouro, SP',
            destination: item.city,
            date: item.date,
            status: status,
            cargo_type: cargoType,
            initial_km: item.initial_km,
            final_km: item.final_km > 0 ? item.final_km : undefined,
            estimated_revenue: revenue,
          });

          // Handle Pernoite (Admin Pernoite Expenses)
          if (item.pernoite_count > 0 && newRoute && driverId) {
            for (let i = 0; i < item.pernoite_count; i++) {
              await servicoFinanceiro.criarDespesa({
                rotaId: newRoute.id,
                motoristaId: driverId,
                tipo: TipoDespesa.PERNOITE_ADMIN,
                valor: 0, // No specific cost in imported Excel yet
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
      {/* Sidebar (Mini Red Style) */}
      <aside className="w-16 bg-white border-r border-gray-100 flex flex-col items-center py-6 gap-6 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
        <div className="w-10 h-10 bg-[#D32F2F] rounded-xl flex items-center justify-center shadow-lg shadow-red-200 mb-2">
          <Truck className="w-6 h-6 text-white" />
        </div>

        <nav className="flex flex-col gap-4 w-full px-2">
          {['dashboard', 'routes', 'fleet', 'financial', 'rates', 'requests', 'drivers'].map((tab) => {
            const icons = { dashboard: LayoutDashboard, routes: Map, fleet: Activity, financial: Wallet, rates: DollarSign, requests: FileText, drivers: Users };
            const names = { dashboard: 'Visão Geral', routes: 'Rotas', fleet: 'Frota', financial: 'Financeiro', rates: 'Taxas', requests: 'Solicitações', drivers: 'Motoristas' };
            const Icon = icons[tab as keyof typeof icons];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === tab ? 'bg-red-50 text-[#D32F2F]' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
                title={names[tab as keyof typeof names]}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </nav>

        <div className="mt-auto">
          <button onClick={onLogout} className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-[#D32F2F] transition-all" title="Sair">
            <LogOut className="w-5 h-5" />
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
                activeTab === 'routes' ? 'Gestão de Rotas' :
                  activeTab === 'fleet' ? 'Controle de Frota' :
                    activeTab === 'financial' ? 'Gestão Financeira' :
                      activeTab === 'rates' ? 'Gerenciamento de Taxas' :
                        activeTab === 'requests' ? 'Solicitações de Pagamento' : 'Gestão de Motoristas'}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {activeTab === 'fleet' ? 'Monitoramento mensal de status dos veículos' :
                activeTab === 'financial' ? 'Gestão financeira e canhotos' :
                  activeTab === 'rates' ? 'Definição de valores de frete e diárias' :
                    activeTab === 'requests' ? 'Gerencie adiantamentos e reembolsos' : 'Visão geral da operação logística'}
            </p>
          </div>

          {activeTab === 'fleet' && (
            <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
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
            </div>
          )}

          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
              Atualizar
            </button>
            {activeTab === 'dashboard' && (
              <>
                <input
                  type="file"
                  ref={dashboardFileInputRef}
                  onChange={handleDashboardImport}
                  className="hidden"
                  accept=".xlsx, .xls"
                />
                <button
                  onClick={() => dashboardFileInputRef.current?.click()}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors shadow-sm shadow-blue-200"
                >
                  <Upload className="w-4 h-4" /> Importar Excel
                </button>

              </>
            )}
            {activeTab === 'financial' && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileImport}
                  className="hidden"
                  accept=".xlsx, .xls"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#10B981] hover:bg-emerald-600 rounded-lg flex items-center gap-2 transition-colors shadow-sm shadow-emerald-200"
                >
                  <Upload className="w-4 h-4" /> Importar Excel
                </button>
              </>
            )}
            {activeTab === 'routes' && (
              <div className="w-4" />
            )}
            {activeTab === 'requests' && (
              <button onClick={() => setIsRequestModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-[#D32F2F] hover:bg-red-700 rounded-lg flex items-center gap-2 transition-colors shadow-sm shadow-red-200">
                <Plus className="w-4 h-4" /> Nova Solicitação
              </button>
            )}
            {activeTab === 'drivers' && (
              <button onClick={() => setIsDriverModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-[#D32F2F] hover:bg-red-700 rounded-lg flex items-center gap-2 transition-colors shadow-sm shadow-red-200">
                <Plus className="w-4 h-4" /> Novo Motorista
              </button>
            )}
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
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">

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
                    <h3 className="text-3xl font-bold text-gray-900">R$ {stats.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
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
                    <h3 className="text-3xl font-bold text-gray-900">R$ {stats.despesasTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
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
                      R$ {stats.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Desempenho por Motorista</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-50">
                          <th className="pb-4 text-xs font-bold text-gray-400 uppercase">Motorista</th>
                          <th className="pb-4 text-xs font-bold text-gray-400 uppercase text-center">Rotas</th>
                          <th className="pb-4 text-xs font-bold text-gray-400 uppercase text-center">KM Total</th>
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
                            <td className="py-4 text-sm font-medium text-gray-500 text-right">R$ {driver.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className={`py-4 text-sm font-bold text-right ${driver.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {driver.profit < 0 ? '-' : ''}R$ {Math.abs(driver.profit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
              </div>

              {/* Bottom Section: Route History Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Histórico de Rotas</h3>
                  <span className="text-xs text-gray-400">Exibindo {filteredRoutes.length} registros</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="pb-4 text-xs font-bold text-gray-400 uppercase">Rota</th>
                        <th className="pb-4 text-xs font-bold text-gray-400 uppercase">Motorista</th>
                        <th className="pb-4 text-xs font-bold text-gray-400 uppercase text-center">Placa</th>
                        <th className="pb-4 text-xs font-bold text-gray-400 uppercase text-center">Início</th>
                        <th className="pb-4 text-xs font-bold text-gray-400 uppercase text-center">Status</th>
                        <th className="pb-4 text-xs font-bold text-gray-400 uppercase text-center">Receita</th>
                        <th className="pb-4 text-xs font-bold text-gray-400 uppercase text-center">Despesas</th>
                        <th className="pb-4 text-xs font-bold text-gray-400 uppercase text-center">Lucro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredRoutes.slice(0, 10).map(route => { // Showing top 10 for performance/mock
                        const driver = drivers.find(d => d.id === route.driver_id);
                        const vehicle = veiculos.find(v => v.id === route.vehicle_id); // This might be undefined if not linked
                        const routeExpenses = expenses.filter(e => e.rotaId === route.id);
                        const totalExpenses = routeExpenses.reduce((acc, e) => acc + e.valor, 0);

                        const revenue = calculateRouteRevenue(route);
                        const profit = revenue - totalExpenses;

                        return (
                          <tr key={route.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-4 text-sm font-bold text-gray-700">#{route.route_number || String(route.id).substr(0, 8)}</td>
                            <td className="py-4 text-sm font-medium text-gray-600">{driver?.nome || 'N/A'}</td>
                            <td className="py-4 text-sm font-medium text-gray-500 text-center uppercase badge bg-gray-100 text-gray-600 rounded px-2 py-1 text-xs">
                              {vehicle?.plate || (driver?.placa ? String(driver.placa) : '-')}
                            </td>
                            <td className="py-4 text-sm font-medium text-gray-500 text-center">{new Date(route.date).toLocaleDateString('pt-BR')}</td>
                            <td className="py-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${route.status === 'Finalizada' ? 'bg-blue-100 text-blue-700' :
                                route.status === 'Em Andamento' ? 'bg-gray-100 text-gray-700' :
                                  route.status === 'Pernoite' ? 'bg-amber-100 text-amber-700' :
                                    'bg-gray-100 text-gray-500'
                                }`}>
                                {route.status}
                              </span>
                            </td>
                            <td className="py-4 text-sm font-medium text-gray-600 text-center">R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="py-4 text-sm font-medium text-red-500 text-center">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className={`py-4 text-sm font-bold text-center ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {profit < 0 ? '-' : ''}R$ {Math.abs(profit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* FINANCIAL CLOSING TAB */}



          {/* FINANCIAL TAB (Fechamento) */}
          {/* FINANCIAL CLOSING TAB */}
          {activeTab === 'financial' && (
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
                  {/* Calculate Stats */}
                  {(() => {
                    let totalValue = 0;
                    let totalReceivable = 0;
                    let divergence = 0;

                    closureRows.forEach(row => {
                      const kmRate = row.vehicle?.km_rate || 0;
                      const valKmSeara = row.km_seara * kmRate;

                      // 1. Valor Total = Valor KM (Seara) + Valor Diária
                      const rowTotalValue = valKmSeara + row.daily_rate;
                      totalValue += rowTotalValue;

                      // 2. Valor a Receber (Real) = Descarga (Spreadsheet 'P')
                      totalReceivable += row.descarga;

                      // 3. Divergência = (Valor KM Seara + Valor Diária) - Descarga
                      // i.e., rowTotalValue - row.descarga
                      divergence += (rowTotalValue - row.descarga);
                    });

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Total Value */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start">
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">VALOR TOTAL</p>
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
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
                            <h3 className="text-2xl font-bold text-green-600 mb-1">R$ {totalReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                            <span className="text-xs text-gray-400">Total Descarga (Planilha)</span>
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
                              R$ {divergence.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">Total - Descarga</span>
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
                    {/* Bar Chart */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <h3 className="font-bold text-gray-800 mb-6">Frete Total no Período</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={financialBarData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                            <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Bar dataKey="value" fill="#1F2937" radius={[4, 4, 0, 0]} barSize={32} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Donut Chart */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800">Canhotos Baixados</h3>
                        <div className="bg-gray-100 rounded-lg p-1 flex text-xs font-medium">
                          <button className="px-3 py-1 bg-white rounded shadow-sm text-gray-900">Mês</button>
                          <button className="px-3 py-1 text-gray-500 hover:text-gray-900">Período</button>
                        </div>
                      </div>
                      <div className="h-64 flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={financialPieData}
                              cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={0} dataKey="value"
                            >
                              <Cell fill="#0F172A" />
                              <Cell fill="#991B1B" />
                            </Pie>
                            <RechartsTooltip />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-white font-bold text-sm">
                            {routes.length > 0
                              ? ((financialPieData[0].value / routes.length) * 100).toFixed(1)
                              : '0.0'}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {closureRows.length > 0 ? (
                    <ClosureTable
                      rows={closureRows}
                      onSave={(updatedRows) => setClosureRows(updatedRows)}
                    />
                  ) : (
                    <div className="flex items-center justify-center p-8 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
                      Importe uma planilha para visualizar o fechamento.
                    </div>
                  )}

                  <div className="flex justify-end gap-3 mt-6">
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
                          const rowTotalValue = valKmSeara + row.daily_rate;
                          totalValue += rowTotalValue;
                          totalReceivable += row.descarga;
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
                            addToast(`Erro: As seguintes rotas já possuem fechamento: ${duplicateNumbers}`, 'error');
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
              )}

              {/* PERNOITES PENDENTES VIEW */}
              {financialView === 'pernoites' && (
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
                        {routes.filter(r => r.status === StatusRota.PERNOITE).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                              Nenhum pernoite pendente de registro no momento.
                            </td>
                          </tr>
                        ) : (
                          routes.filter(r => r.status === StatusRota.PERNOITE).map(route => (
                            <tr key={route.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4 font-medium text-gray-900">
                                {drivers.find(d => d.id === route.driver_id)?.nome || 'N/A'}
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-gray-900 font-bold">{route.route_number || `#${route.id.substring(0, 6)}`}</div>
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
                                    setIsPernoiteAdminModalOpen(true);
                                  }}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 ml-auto"
                                >
                                  <Receipt className="w-4 h-4" />
                                  Registrar Despesa
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* HISTORY VIEW */}
              {financialView === 'history' && (
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
                            R$ {closure.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-green-600 font-medium">
                            R$ {closure.total_receivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`px-6 py-4 font-bold ${closure.divergence < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                            R$ {closure.divergence.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
              )}

              {/* DETAIL VIEW */}
              {financialView === 'detail' && selectedClosure && (
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
                        Fechamento: {selectedClosure.date.includes('T')
                          ? new Date(selectedClosure.date).toLocaleString('pt-BR')
                          : selectedClosure.date.split('-').reverse().join('/')}
                      </h3>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          // Export to PDF
                          const doc = new jsPDF();
                          const tableData = selectedClosure.rows.map((row: any) => [
                            row.route_number || '-',
                            row.vehicle?.plate || '-',
                            row.payment_date && row.payment_date.includes('-') ? row.payment_date.split('-').reverse().join('/') : (row.payment_date || '-'),
                            row.km_seara.toLocaleString('pt-BR'),
                            row.km_real.toLocaleString('pt-BR'),
                            `R$ ${row.val_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                            `R$ ${row.descarga.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          ]);

                          doc.text(`Fechamento Financeiro - ${new Date(selectedClosure.date).toLocaleString('pt-BR')}`, 14, 15);

                          autoTable(doc, {
                            head: [['Rota', 'Placa', 'Data Pgto', 'KM Seara', 'KM Real', 'Valor Total', 'Valor Recebido']],
                            body: tableData,
                            startY: 20,
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
                          const ws = XLSX.utils.json_to_sheet(selectedClosure.rows.map((row: any) => ({
                            'Rota': row.route_number,
                            'Placa': row.vehicle?.plate,
                            'Data Pagamento': row.payment_date,
                            'KM Seara': row.km_seara,
                            'Valor Diária': row.daily_rate,
                            'Valor KM Seara': row.val_km_seara,
                            'Valor Total': row.val_total,
                            'Valor Recebido (Descarga)': row.descarga
                          })));
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
                      <p className="text-xl font-bold text-gray-900">R$ {selectedClosure.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">VALOR RECEBIDO</p>
                      <p className="text-xl font-bold text-green-600">R$ {selectedClosure.total_receivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">DIVERGÊNCIA</p>
                      <p className={`text-xl font-bold ${selectedClosure.divergence < 0 ? 'text-red-500' : 'text-gray-900'}`}>R$ {selectedClosure.divergence.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  <ClosureTable rows={selectedClosure.rows} readOnly={true} />
                </div>
              )}
            </div>
          )}



          {/* ROUTES TAB */}
          {activeTab === 'routes' && (
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
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Nova Rota
                    </button>
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
                        <th className="px-4 py-3">DATA DE INÍCIO</th>
                        <th className="px-4 py-3">KM INICIAL</th>
                        <th className="px-4 py-3">KM FINAL</th>
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
                        const totalExpenses = routeExpenses.reduce((sum, exp) => sum + exp.valor, 0);



                        // Calculate revenue properly
                        let revenue = 0;
                        let vehicle = null;

                        if (route.final_km && route.initial_km) {
                          // Try multiple ways to find the vehicle

                          // 1. Try vehicle_id from route
                          if (route.vehicle_id) {
                            vehicle = veiculos.find(v => v.id === route.vehicle_id);
                          }

                          // 2. Try driver's plate (license_plate)
                          if (!vehicle && driver?.placa) {
                            vehicle = veiculos.find(v => v.plate === driver.placa);
                          }

                          // 3. TEMPORARY: If still no vehicle and we have vehicles, use first one as fallback
                          // This is just for debugging - remove after fixing data
                          if (!vehicle && veiculos.length > 0) {
                            vehicle = veiculos[0];
                            console.warn('⚠️ Using first vehicle as fallback for route:', route.id);
                            console.log('Route vehicle_id:', route.vehicle_id, 'Driver placa:', driver?.placa);
                            console.log('Available vehicles:', veiculos.map(v => ({ id: v.id, plate: v.plate })));
                          }

                          if (vehicle) {
                            const kmRodados = route.final_km - route.initial_km;
                            revenue = vehicle.daily_rate + (kmRodados * vehicle.km_rate);
                          }
                        }




                        const profit = revenue - totalExpenses;

                        return (
                          <tr key={route.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedRoute(route)} /**/ >
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${route.status === StatusRota.FINALIZADA ? 'bg-green-100 text-green-700' :
                                route.status === StatusRota.EM_ANDAMENTO ? 'bg-blue-100 text-blue-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                {route.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-mono text-gray-600">
                                {route.route_number || `#${route.id.substring(0, 6).toUpperCase()}`}
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
                              {driver?.nome || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {new Date(route.date).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                              {route.initial_km ? route.initial_km.toLocaleString('pt-BR') : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                              {route.final_km ? route.final_km.toLocaleString('pt-BR') : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-gray-900">
                              {route.final_km && route.initial_km ?
                                (route.final_km - route.initial_km).toLocaleString('pt-BR') + ' km' :
                                '-'
                              }
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-blue-600">
                              R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-orange-600">
                              R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-sm font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
          )}

          {/* FLEET CONTROL TAB */}
          {/* REQUESTS TAB */}
          {activeTab === 'requests' && (
            <div className="flex flex-col h-full">
              {/* Tabs */}
              <div className="flex gap-6 border-b border-gray-100 mb-6">
                {Object.values(StatusSolicitacao).map((status) => {
                  const count = solicitacoes.filter(r => r.status === status).length;
                  return (
                    <button
                      key={status}
                      onClick={() => setActiveRequestTab(status)}
                      className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeRequestTab === status ? 'border-[#D32F2F] text-[#D32F2F]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                      {status}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeRequestTab === status ? 'bg-red-50 text-[#D32F2F]' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Content */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
                {solicitacoes.filter(r => r.status === activeRequestTab).length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <span className="text-3xl font-light text-gray-300">$</span>
                    </div>
                    <p className="text-gray-400">Nenhuma solicitação nesta categoria.</p>
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#FAFBFF] border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Motorista</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Categoria</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Descrição</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Data</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Valor</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {solicitacoes.filter(r => r.status === activeRequestTab).map(req => (
                          <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900">
                              {drivers.find(d => d.id === req.driverId)?.name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-gray-600">{req.type}</td>
                            <td className="px-6 py-4 text-gray-600 truncate max-w-[200px]">{req.description}</td>
                            <td className="px-6 py-4 text-gray-600">{new Date(req.date).toLocaleDateString('pt-BR')}</td>
                            <td className="px-6 py-4 font-bold text-gray-900">R$ {req.amount.toFixed(2)}</td>
                            <td className="px-6 py-4 text-right">
                              {req.status === StatusSolicitacao.AGUARDANDO && (
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => addToast('Solicitação aprovada!', 'success')} className="p-1 text-green-600 hover:bg-green-50 rounded"><CheckCircle2 className="w-4 h-4" /></button>
                                  <button onClick={() => addToast('Solicitação recusada!', 'error')} className="p-1 text-red-600 hover:bg-red-50 rounded"><AlertCircle className="w-4 h-4" /></button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'rates' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
              <div className="overflow-auto flex-1">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#FAFBFF] border-b border-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider bg-[#FAFBFF]">Veículo / Placa</th>
                      <th className="px-6 py-4 text-xs font-bold text-blue-600 uppercase tracking-wider text-center bg-[#FAFBFF]">Diária (R$)</th>
                      <th className="px-6 py-4 text-xs font-bold text-green-600 uppercase tracking-wider text-center bg-[#FAFBFF]">Taxa por KM (R$)</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center bg-[#FAFBFF]">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {veiculos.map((vehicle) => (
                      <tr key={vehicle.plate} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{vehicle.plate}</div>
                          <div className="text-xs text-gray-400">{vehicle.model}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-gray-600">
                          R$ {vehicle.daily_rate?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-gray-600">
                          R$ {vehicle.km_rate?.toFixed(2) || '0.00'}
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
          )}

          {activeTab === 'fleet' && (
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
          )}

          {/* DRIVERS VIEW */}
          {activeTab === 'drivers' && (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <DriversView drivers={drivers} onDeleteDriver={onDeleteDriver} />
            </div>
          )}

        </div>
      </main >

      {/* Vehicle Edit Modal */}
      {
        isVehicleModalOpen && editingVehicle && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Editar Taxas do Veículo</h3>
                <button onClick={() => setIsVehicleModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
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
      {isPernoiteAdminModalOpen && routeForPernoiteExpense && (
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
      )}
      {/* Route Modal */}
      {
        isRouteModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Nova Rota</h3>
                <button onClick={() => setIsRouteModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <form onSubmit={handleCreateRoute} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motorista</label>
                  <select
                    className="w-full border-gray-300 border rounded-lg p-2"
                    required
                    onChange={(e) => setNewRoute({ ...newRoute, driver_id: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
                    <input type="text" required className="w-full border-gray-300 border rounded-lg p-2"
                      onChange={(e) => setNewRoute({ ...newRoute, origin: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
                    <input type="text" required className="w-full border-gray-300 border rounded-lg p-2"
                      onChange={(e) => setNewRoute({ ...newRoute, destination: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Carga</label>
                    <input type="text" required className="w-full border-gray-300 border rounded-lg p-2"
                      placeholder="Ex: Soja"
                      onChange={(e) => setNewRoute({ ...newRoute, cargo_type: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Receita Estimada (R$)</label>
                    <input type="number" required className="w-full border-gray-300 border rounded-lg p-2"
                      onChange={(e) => setNewRoute({ ...newRoute, estimated_revenue: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Início</label>
                  <input type="date" required className="w-full border-gray-300 border rounded-lg p-2"
                    onChange={(e) => setNewRoute({ ...newRoute, date: e.target.value })}
                  />
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
                <button onClick={() => setIsDriverModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <form onSubmit={handleCreateDriver} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <input type="text" required className="w-full border-gray-300 border rounded-lg p-2"
                    value={newDriver.name || ''}
                    onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
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
                    value={newDriver.phone || ''}
                    onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modelo do Veículo</label>
                    <input type="text" className="w-full border-gray-300 border rounded-lg p-2"
                      placeholder="Ex: Volvo FH 540"
                      value={newDriver.vehicleModel || ''}
                      onChange={(e) => setNewDriver({ ...newDriver, vehicleModel: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
                    <input type="text" className="w-full border-gray-300 border rounded-lg p-2 uppercase"
                      placeholder="ABC-1234"
                      value={newDriver.licensePlate || ''}
                      onChange={(e) => setNewDriver({ ...newDriver, licensePlate: e.target.value })}
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

      {/* Request Modal */}
      {
        isRequestModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Nova Solicitação</h3>
                <button onClick={() => setIsRequestModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                addToast("Solicitação criada com sucesso!", 'success');
                setIsRequestModalOpen(false);
              }} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motorista</label>
                  <select className="w-full border-gray-300 border rounded-lg p-2" required>
                    <option value="">Selecione...</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <select className="w-full border-gray-300 border rounded-lg p-2" required>
                      <option value="Adiantamento">Adiantamento</option>
                      <option value="Reembolso">Reembolso</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                    <input type="number" required className="w-full border-gray-300 border rounded-lg p-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input type="date" required className="w-full border-gray-300 border rounded-lg p-2" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea className="w-full border-gray-300 border rounded-lg p-2" rows={3}></textarea>
                </div>
                <button type="submit" className="w-full bg-[#D32F2F] text-white py-2 rounded-lg font-medium hover:bg-red-700">Registrar Solicitação</button>
              </form>
            </div>
          </div>
        )
      }

      {/* Route Details Modal */}
      {selectedRoute && (
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
                            value={editedRouteData.date ? new Date(editedRouteData.date).toISOString().split('T')[0] : new Date(selectedRoute.date).toISOString().split('T')[0]}
                            onChange={(e) => setEditedRouteData({ ...editedRouteData, date: e.target.value })}
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-900">{new Date(selectedRoute.date).toLocaleDateString('pt-BR')}</span>
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
                          <span className="text-sm font-medium text-gray-900">{drivers.find(d => d.id === selectedRoute.driver_id)?.nome || 'N/A'}</span>
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
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Resumo Financeiro</h4>
                    {(() => {
                      // Revenue Calculation
                      let calculatedRevenue = 0;
                      const vehicle = veiculos.find(v => v.id === selectedRoute.vehicle_id);
                      if (vehicle && selectedRoute.initial_km && selectedRoute.final_km) {
                        const kmRodados = selectedRoute.final_km - selectedRoute.initial_km;
                        calculatedRevenue = (kmRodados * vehicle.km_rate) + vehicle.daily_rate;
                      } else {
                        // Fallback to estimated revenue if vehicle logic fails or data missing
                        calculatedRevenue = selectedRoute.estimated_revenue || 0;
                      }

                      // Expenses
                      const totalExpenses = expenses.filter(e => e.rotaId === selectedRoute.id)
                        .reduce((sum, e) => sum + (Number(e.valor) || 0), 0);

                      const profit = calculatedRevenue - totalExpenses;

                      return (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <p className="text-xs text-blue-600 mb-1 font-bold uppercase">Receita Total</p>
                            <p className="text-xl font-bold text-blue-700">R$ {calculatedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            {vehicle && <p className="text-[10px] text-blue-400 mt-1">(KM * {vehicle.km_rate}) + {vehicle.daily_rate}</p>}
                          </div>
                          <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                            <p className="text-xs text-red-600 mb-1 font-bold uppercase">Despesas</p>
                            <p className="text-xl font-bold text-red-700">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div className="col-span-2 bg-gray-900 p-5 rounded-xl text-white shadow-lg shadow-gray-200">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-xs text-gray-400 mb-1 font-bold uppercase">Lucro Líquido</p>
                                <p className={`text-3xl font-bold ${profit < 0 ? 'text-red-400' : 'text-white'}`}>
                                  R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                          {expenses.filter(e => e.rotaId === selectedRoute.id).map(exp => (
                            <tr
                              key={exp.id}
                              className={`hover:bg-gray-50 transition-colors ${exp.img_url ? 'cursor-pointer' : ''}`}
                              onClick={() => exp.img_url && window.open(exp.img_url, '_blank')}
                            >
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {exp.tipo}
                                <div className="text-[10px] text-gray-400 font-normal">{new Date(exp.date).toLocaleDateString('pt-BR')}</div>
                              </td>
                              <td className="px-4 py-3 font-bold text-red-600">R$ {Number(exp.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="px-4 py-3 text-right">
                                {exp.img_url ? (
                                  <div className="text-blue-600 p-1 rounded inline-block" title="Ver anexo">
                                    <Paperclip className="w-4 h-4" />
                                  </div>
                                ) : <span className="text-gray-300">-</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-8 text-center border border-dashed border-gray-200">
                      <p className="text-gray-500 text-sm">Nenhuma despesa lançada.</p>
                    </div>
                  )}
                </div>
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
                <button onClick={() => setIsStatusModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="p-6">
                <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-400 uppercase">Veículo</span>
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
                    { code: 'D', label: 'Disponível', color: 'bg-purple-500' },
                    { code: 'P', label: 'Pernoite', color: 'bg-amber-500' },
                    { code: 'O', label: 'Manutenção', color: 'bg-red-500' },
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
    </div >
  );
};
