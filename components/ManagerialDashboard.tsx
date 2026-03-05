
import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { Rota, Despesa, Veiculo, TipoDespesa, Motorista, SolicitacaoPagamento, StatusSolicitacao } from '../types';
import * as XLSX from 'xlsx';
import {
    TrendingUp, TrendingDown, DollarSign, Truck, Wallet, Receipt, BarChart3, Mail, Activity,
    ExternalLink, Download, Droplets, AlertTriangle, RefreshCw, Factory, Search,
    Image as ImageIcon, X, Calendar, FileText
} from 'lucide-react';
import { UnloadingReimbursement } from './UnloadingReimbursement';

interface ManagerialDashboardProps {
    routes: Rota[];
    expenses: Despesa[];
    vehicles: Veiculo[];
    dateStart?: string;
    dateEnd?: string;
    drivers: Motorista[];
    solicitacoes: SolicitacaoPagamento[];
    onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
    onRefresh: () => void;
}

const formatDateNoTimezone = (dateStr: string | undefined | Date) => {
    if (!dateStr) return '-';

    let str = '';
    if (dateStr instanceof Date) {
        // If it's a date object, toISOString() gives UTC YYYY-MM-DDTHH:mm:ss.sssZ
        str = dateStr.toISOString();
    } else {
        str = String(dateStr);
    }

    // Extract YYYY-MM-DD
    const datePart = str.includes('T') ? str.split('T')[0] : str;

    // Strict regex for YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        const [year, month, day] = datePart.split('-');
        return `${day}/${month}/${year}`;
    }

    // Fallback: If it doesn't match YYYY-MM-DD, return as is or try safe locale
    // This handles cases where it might already be DD/MM/YYYY or other formats
    return datePart;
};

export const ManagerialDashboard: React.FC<ManagerialDashboardProps> = ({
    routes,
    expenses,
    vehicles,
    dateStart,
    dateEnd,
    drivers,
    solicitacoes,
    onAddToast,
    onRefresh
}) => {
    const [view, setView] = useState<'analytics' | 'reimbursement' | 'results'>('analytics');
    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [selectedMaintenanceVehicle, setSelectedMaintenanceVehicle] = useState<string | null>(null);

    const [selectedRouteForDetails, setSelectedRouteForDetails] = useState<string | null>(null);
    const [selectedWashVehicle, setSelectedWashVehicle] = useState<string | null>(null);
    const [selectedSalaryDriver, setSelectedSalaryDriver] = useState<string | null>(null);
    const [selectedDamageDriver, setSelectedDamageDriver] = useState<string | null>(null);
    const [selectedExpenseDetail, setSelectedExpenseDetail] = useState<Despesa | null>(null);
    const [selectedOperationalDrillDown, setSelectedOperationalDrillDown] = useState<{ driverId: string; type: TipoDespesa } | null>(null);

    // Filter data based on date range if provided
    const filteredRoutes = useMemo(() => {
        if (!dateStart && !dateEnd) return routes;
        return routes.filter(r => {
            if (dateStart && r.date < dateStart) return false;
            if (dateEnd && r.date > dateEnd) return false;
            return true;
        });
    }, [routes, dateStart, dateEnd]);

    const filteredExpenses = useMemo(() => {
        if (!dateStart && !dateEnd) return expenses;
        return expenses.filter(e => {
            if (dateStart && e.date < dateStart) return false;
            if (dateEnd && e.date > dateEnd) return false;
            return true;
        });
    }, [expenses, dateStart, dateEnd]);

    // Financial Calculations
    const metrics = useMemo(() => {
        let grossGain = 0;
        let revenueFromDiarias = 0;
        let revenueFromKm = 0;

        let totalExpenses = 0; // Operacional (Combustível, Alimentação, Chapa, Pernoite, Outros)
        let totalDescarga = 0; // Reembolsável (Descarga)
        let totalMercadoriaPaga = 0; // Reembolsável (Mercadoria Paga)

        // 1. Calculate Predicted Gross Gain from Routes
        filteredRoutes.forEach(route => {
            const vehicle = vehicles.find(v => v.id === route.vehicle_id || v.plate === route.plate);
            if (vehicle) {
                const kmSeara = Number(route.km_final_seara) || 0;
                const kmRate = Number(vehicle.km_rate) || 0;
                const dailyRate = Number(vehicle.daily_rate) || 0;

                // Formula: km_seara * km_rate_da_placa + diaria_da_placa
                const kmRev = kmSeara * kmRate;
                const dailyRev = dailyRate;

                revenueFromKm += kmRev;
                revenueFromDiarias += dailyRev;
                grossGain += kmRev + dailyRev;
            }
        });

        // Fix for when we used manual estimated_revenue but we want the breakdown to sum up (roughly)
        // If grossGain != (revenueFromKm + revenueFromDiarias), we should probably normalize or show 'Ajustes'.
        // For simplicity in this iteration: We will display the strict calculated "Diárias" and "KM" in the tooltip.
        // And if the Total doesn't match, we add an "Ajustes/Extras" line in the tooltip to balance it.
        const gap = grossGain - (revenueFromKm + revenueFromDiarias);


        // 2. Calculate Expenses by category
        // We will expand this list to include all types found in TipoDespesa or observed data
        const expenseDetails: Record<string, number> = {};

        // Initialize known keys for order/display preference if needed, or just let them accumulate
        Object.values(TipoDespesa).forEach(t => {
            if (t !== TipoDespesa.DESCARGA && t !== TipoDespesa.MERCADORIA_PAGA) expenseDetails[t] = 0;
        });

        filteredExpenses.forEach(exp => {
            const val = Number(exp.valor) || 0;
            if (exp.tipo === TipoDespesa.DESCARGA) {
                totalDescarga += val;
            } else if (exp.tipo === TipoDespesa.MERCADORIA_PAGA) {
                totalMercadoriaPaga += val;
            } else {
                const tipo = exp.tipo;
                if (expenseDetails[tipo] !== undefined) {
                    expenseDetails[tipo] += val;
                } else {
                    expenseDetails[tipo] = val;
                }
                totalExpenses += val;
            }
        });

        const netGain = grossGain - totalExpenses;

        return {
            grossGain,
            revenueFromDiarias,
            revenueFromKm,
            revenueGap: gap,
            totalExpenses,
            totalDescarga,
            totalMercadoriaPaga,
            netGain,
            expenseDetails
        };
    }, [filteredRoutes, filteredExpenses, vehicles]);

    // Chart Data preparation
    const pieData = Object.entries(metrics.expenseDetails).map(([name, value]) => ({
        name,
        value: value as number
    })).filter(d => d.value > 0);

    const routesMetrics = useMemo(() => {
        return filteredRoutes.map(route => {
            let revenue = 0;
            const vehicle = vehicles.find(v => v.id === route.vehicle_id || v.plate === route.plate);

            // Formula: km_seara * km_rate_da_placa + diaria_da_placa
            if (vehicle) {
                const kmSeara = Number(route.km_final_seara) || 0;
                const kmRate = Number(vehicle.km_rate) || 0;
                const dailyRate = Number(vehicle.daily_rate) || 0;
                revenue = (kmSeara * kmRate) + dailyRate;
            }

            const routeExpenses = expenses
                .filter(e => e.rotaId === route.id && e.tipo !== TipoDespesa.DESCARGA && e.tipo !== TipoDespesa.MERCADORIA_PAGA)
                .reduce((sum, e) => sum + (Number(e.valor) || 0), 0);

            return {
                ...route,
                orderedDate: route.date, // Keep original for sorting
                displayDate: route.date, // Will be used for display (can be adjusted if created_at is preferred)
                calculatedRevenue: revenue,
                calculatedExpenses: routeExpenses,
                calculatedResult: revenue - routeExpenses
            };
        }).sort((a, b) => new Date(b.orderedDate).getTime() - new Date(a.orderedDate).getTime());
    }, [filteredRoutes, expenses, vehicles]);

    const totals = useMemo(() => {
        return routesMetrics.reduce((acc, curr) => ({
            revenue: acc.revenue + curr.calculatedRevenue,
            expenses: acc.expenses + curr.calculatedExpenses,
            result: acc.result + curr.calculatedResult
        }), { revenue: 0, expenses: 0, result: 0 });
    }, [routesMetrics]);

    // Separate OPERATIONAL costs (driver-linked) from FIXED costs (salary only)
    const FIXED_COST_TYPES = [TipoDespesa.SALARIO];
    const OPERATIONAL_COST_TYPES = [TipoDespesa.COMBUSTIVEL, TipoDespesa.ALIMENTACAO, TipoDespesa.CHAPA, TipoDespesa.PERNOITE_ADMIN, TipoDespesa.PEDAGIO, TipoDespesa.MANUTENCAO, TipoDespesa.LAVAGEM, TipoDespesa.AVARIA, TipoDespesa.OUTROS];

    // Driver Metrics
    const stratifiedDriverData = useMemo(() => {
        if (!routesMetrics.length) return [];

        // Deduplicate expenses globally for the period (ignore duplicates with same route, type, value)
        const uniqueExpensesMap = new Map<string, typeof filteredExpenses[0]>();
        filteredExpenses.forEach(exp => {
            const val = Number(exp.valor).toFixed(2);
            // Use a composite key. If rotaId exists, use it. Otherwise rely on other fields?
            // Most relevant duplicates are route-based.
            // If rotaId is missing, maybe rely on date/driver?
            // Let's stick to rotaId + tipo + val as primary dedupe key.
            // If rotaId is null, we might over-deduplicate if we use 'null-tipo-val'.
            // So if rotaId is null, use id (no dedupe) or driverId+date+tipo+val.
            let key = '';
            if (exp.rotaId) {
                key = `${exp.rotaId}-${exp.tipo}-${val}`;
            } else {
                key = `${exp.motoristaId}-${new Date(exp.date).toISOString().split('T')[0]}-${exp.tipo}-${val}`;
            }

            if (!uniqueExpensesMap.has(key)) {
                uniqueExpensesMap.set(key, exp);
            }
        });
        const uniqueExpenses = Array.from(uniqueExpensesMap.values());

        return drivers.map(driver => {
            const driverRoutes = routesMetrics.filter(r => r.driver_id === driver.id);
            const revenue = driverRoutes.reduce((acc, r) => acc + r.calculatedRevenue, 0);

            // Use unique expenses
            const driverExpenses = uniqueExpenses.filter(e => e.motoristaId === driver.id);

            const operationalExpenses: Record<string, number> = {
                [TipoDespesa.ALIMENTACAO]: 0,
                [TipoDespesa.COMBUSTIVEL]: 0,
                [TipoDespesa.PEDAGIO]: 0,
                [TipoDespesa.OUTROS]: 0,
                [TipoDespesa.CHAPA]: 0,
                [TipoDespesa.PERNOITE_ADMIN]: 0,
                [TipoDespesa.AVARIA]: 0,
                [TipoDespesa.DESCARGA]: 0,
                [TipoDespesa.MERCADORIA_PAGA]: 0,
            };
            let driverSalario = 0;

            driverExpenses.forEach(exp => {
                const val = Number(exp.valor) || 0;
                // Salary handled separately
                if (exp.tipo === TipoDespesa.SALARIO) {
                    driverSalario += val;
                    return;
                }
                // Skip lavagem/manutencao from driver columns (they go into company operational)
                if (exp.tipo === TipoDespesa.LAVAGEM || exp.tipo === TipoDespesa.MANUTENCAO) return;
                const tipo = exp.tipo as keyof typeof operationalExpenses;
                if (operationalExpenses[tipo] !== undefined) {
                    operationalExpenses[tipo] += val;
                } else {
                    operationalExpenses[TipoDespesa.OUTROS] += val;
                }
            });

            // Total excludes DESCARGA — it's shown informatively only, doesn't affect result
            const totalOperational = Object.entries(operationalExpenses)
                .filter(([tipo]) => tipo !== TipoDespesa.DESCARGA && tipo !== TipoDespesa.MERCADORIA_PAGA)
                .reduce((acc, [, v]) => acc + v, 0);

            return {
                driver,
                revenue,
                expenses: operationalExpenses,
                salario: driverSalario,
                totalExpenses: totalOperational,
                result: revenue - totalOperational,
                margin: revenue > 0 ? ((revenue - totalOperational) / revenue) * 100 : 0
            };
        }).filter(d => d.revenue > 0 || d.totalExpenses > 0 || d.salario > 0)
            .sort((a, b) => b.revenue - a.revenue);
    }, [drivers, routesMetrics, filteredExpenses]);

    // Fixed costs & Maintenance & Wash & Damage
    const fixedCosts = useMemo(() => {
        // Deduplicate expenses (reusing logic or re-implementing essentially same logic)
        const uniqueExpensesMap = new Map<string, typeof filteredExpenses[0]>();
        filteredExpenses.forEach(exp => {
            const val = Number(exp.valor).toFixed(2);
            let key = '';
            if (exp.rotaId) {
                key = `${exp.rotaId}-${exp.tipo}-${val}`;
            } else {
                key = `${exp.motoristaId}-${new Date(exp.date).toISOString().split('T')[0]}-${exp.tipo}-${val}`;
            }
            if (!uniqueExpensesMap.has(key)) {
                uniqueExpensesMap.set(key, exp);
            }
        });
        const uniqueExpenses = Array.from(uniqueExpensesMap.values());

        const salaryByDriver: Record<string, { name: string; placa: string; total: number; driverId: string }> = {};
        const maintenanceByPlate: Record<string, { plate: string; model: string; total: number; vehicleId: string }> = {};
        const washByPlate: Record<string, { plate: string; model: string; total: number; vehicleId: string }> = {};
        const chapaByPlate: Record<string, { plate: string; model: string; total: number; date?: string; expenseId: string }> = {};
        const damageByDriver: Record<string, { name: string; count: number; total: number; driverId: string }> = {};

        uniqueExpenses.forEach(exp => {
            const val = Number(exp.valor) || 0;
            const expDate = exp.date;

            // Salary
            if (exp.tipo === TipoDespesa.SALARIO) {
                const driver = drivers.find(d => d.id === exp.motoristaId);
                const key = exp.motoristaId || 'unknown';
                if (!salaryByDriver[key]) {
                    salaryByDriver[key] = { name: driver?.nome || 'Não identificado', placa: driver?.placa || '-', total: 0, driverId: key };
                }
                salaryByDriver[key].total += val;
            }

            // Maintenance
            if (exp.tipo === TipoDespesa.MANUTENCAO) {
                const vehicle = vehicles.find(v => v.id === exp.vehicleId);
                const key = exp.vehicleId || 'unknown';
                if (!maintenanceByPlate[key]) {
                    maintenanceByPlate[key] = { plate: vehicle?.plate || 'S/ Placa', model: vehicle?.model || '-', total: 0, vehicleId: key };
                }
                maintenanceByPlate[key].total += val;
            }

            // Wash (Lavagem)
            if (exp.tipo === TipoDespesa.LAVAGEM) {
                const vehicle = vehicles.find(v => v.id === exp.vehicleId);
                const key = exp.vehicleId || 'unknown';
                if (!washByPlate[key]) {
                    washByPlate[key] = { plate: vehicle?.plate || 'S/ Placa', model: vehicle?.model || '-', total: 0, vehicleId: key };
                }
                washByPlate[key].total += val;
            }

            // Chapa by plate (company operational)
            if (exp.tipo === TipoDespesa.CHAPA) {
                const driver = drivers.find(d => d.id === exp.motoristaId);
                const route = routes.find(r => r.id === exp.rotaId);
                const key = exp.id || Math.random().toString(); // Individual entries for better detail
                if (!chapaByPlate[key]) {
                    chapaByPlate[key] = {
                        plate: driver?.nome || 'Sem Identif.',
                        model: route?.route_number ? `Rota ${route.route_number}` : 'S/ Rota',
                        total: 0,
                        date: expDate,
                        expenseId: exp.id || ''
                    };
                }
                chapaByPlate[key].total += val;
            }

            // Damage (Avaria)
            if (exp.tipo === TipoDespesa.AVARIA) {
                const driver = drivers.find(d => d.id === exp.motoristaId);
                const key = exp.motoristaId || 'unknown';
                if (!damageByDriver[key]) {
                    damageByDriver[key] = { name: driver?.nome || 'Não identificado', count: 0, total: 0, driverId: key };
                }
                damageByDriver[key].count += 1;
                damageByDriver[key].total += val;
            }
        });

        const totalSalary = Object.values(salaryByDriver).reduce((acc, v) => acc + v.total, 0);
        const totalMaintenance = Object.values(maintenanceByPlate).reduce((acc, v) => acc + v.total, 0);
        const totalWash = Object.values(washByPlate).reduce((acc, v) => acc + v.total, 0);
        const totalChapa = Object.values(chapaByPlate).reduce((acc, v) => acc + v.total, 0);

        // Mercadoria Paga — grouped by driver
        const mercadoriaPagaByDriver: Record<string, { name: string; total: number; driverId: string; entries: { routeNum: string; date: string; valor: number; expenseId: string }[] }> = {};
        uniqueExpenses.forEach(exp => {
            if (exp.tipo !== TipoDespesa.MERCADORIA_PAGA) return;
            const val = Number(exp.valor) || 0;
            const driver = drivers.find(d => d.id === exp.motoristaId);
            const route = routes.find(r => r.id === exp.rotaId);
            const key = exp.motoristaId || 'unknown';
            if (!mercadoriaPagaByDriver[key]) {
                mercadoriaPagaByDriver[key] = { name: driver?.nome || 'Não identificado', total: 0, driverId: key, entries: [] };
            }
            mercadoriaPagaByDriver[key].total += val;
            mercadoriaPagaByDriver[key].entries.push({
                routeNum: route?.route_number ? `Rota ${route.route_number}` : 'S/ Rota',
                date: exp.date,
                valor: val,
                expenseId: exp.id || ''
            });
        });
        const totalMercadoriaPaga = Object.values(mercadoriaPagaByDriver).reduce((acc, v) => acc + v.total, 0);

        return {
            salary: Object.values(salaryByDriver).sort((a, b) => b.total - a.total),
            maintenance: Object.values(maintenanceByPlate).sort((a, b) => b.total - a.total),
            wash: Object.values(washByPlate).sort((a, b) => b.total - a.total),
            chapa: Object.values(chapaByPlate).sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime()),
            damage: Object.values(damageByDriver).sort((a, b) => b.count - a.count),
            mercadoriaPaga: Object.values(mercadoriaPagaByDriver).sort((a, b) => b.total - a.total),
            totalSalary,
            totalMaintenance,
            totalWash,
            totalChapa,
            totalMercadoriaPaga,
            totalDamage: Object.values(damageByDriver).reduce((acc, v) => acc + v.total, 0),
            totalFixed: totalSalary
        };
    }, [filteredExpenses, drivers, vehicles]);

    // Grand totals including fixed costs
    const grandTotals = useMemo(() => {
        // Calculate total operational from ALL expenses (including driverless maintenance/wash)
        const totalOperational = filteredExpenses
            .filter(e => OPERATIONAL_COST_TYPES.includes(e.tipo as TipoDespesa) &&
                e.tipo !== TipoDespesa.DESCARGA &&
                e.tipo !== TipoDespesa.MERCADORIA_PAGA)
            .reduce((acc, e) => acc + (Number(e.valor) || 0), 0);

        const totalAllExpenses = totalOperational + fixedCosts.totalFixed;
        return {
            revenue: totals.revenue,
            operational: totalOperational,
            fixed: fixedCosts.totalFixed,
            totalExpenses: totalAllExpenses,
            result: totals.revenue - totalAllExpenses,
            margin: totals.revenue > 0 ? ((totals.revenue - totalAllExpenses) / totals.revenue) * 100 : 0
        };
    }, [totals, filteredExpenses, fixedCosts]);

    const COLORS = ['#D32F2F', '#1976D2', '#388E3C', '#FBC02D', '#7B1FA2'];

    // Payments requested via panel or manually - AND Expenses
    const paymentsSummary = useMemo(() => {
        const getVal = (s: any) => Number(s.valor ?? s.amount ?? 0);

        // 1. Filter Solicitacoes
        const filteredSolicitacoes = solicitacoes.filter(s => {
            if (!dateStart && !dateEnd) return true;
            return s.date >= dateStart && s.date <= dateEnd;
        });

        // 2. Filter Expenses (as payments/costs)
        // We only want to show expenses here that are "Avulsas" or maybe all expenses?
        // User said: "Mostrar os lançamentos de custos feitos... pagina Registro de Pagamento Avulso"
        // Let's include ALL filtered expenses as "Approved/Paid" items for visibility
        const expenseItems = filteredExpenses.map(exp => ({
            id: exp.id,
            motoristaId: exp.motoristaId,
            tipo: exp.tipo, // e.g. 'Combustível', 'Manutenção'
            valor: exp.valor,
            date: exp.date,
            status: StatusSolicitacao.PAGO, // Expenses are already "paid"/recorded
            descricao: exp.observacoes || 'Sem descrição',
            metodoPagamento: 'Outro', // Expenses usually don't have this field, assume generic
            comprovanteUrl: exp.img_url,
            isExpense: true // Flag to distinguish
        }));

        // Combine both lists
        const allItems = [...filteredSolicitacoes, ...expenseItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const byStatus = {
            [StatusSolicitacao.AGUARDANDO]: filteredSolicitacoes.filter(s => s.status === StatusSolicitacao.AGUARDANDO),
            [StatusSolicitacao.APROVADO]: filteredSolicitacoes.filter(s => s.status === StatusSolicitacao.APROVADO),
            [StatusSolicitacao.PAGO]: filteredSolicitacoes.filter(s => s.status === StatusSolicitacao.PAGO),
            [StatusSolicitacao.RECUSADO]: filteredSolicitacoes.filter(s => s.status === StatusSolicitacao.RECUSADO),
            // Expenses count as PAGO usually, but let's keep them in the main list logic
        };

        const totalValue = allItems.reduce((acc, s) => acc + getVal(s), 0);

        // Calculate totals based on mixed list? Or just solicitations?
        // Usually "Pending" refers to Solicitations.
        const totalPago = byStatus[StatusSolicitacao.PAGO].reduce((acc, s) => acc + getVal(s), 0) +
            expenseItems.reduce((acc, e) => acc + getVal(e), 0);

        const totalPendente = byStatus[StatusSolicitacao.AGUARDANDO].reduce((acc, s) => acc + getVal(s), 0) +
            byStatus[StatusSolicitacao.APROVADO].reduce((acc, s) => acc + getVal(s), 0);

        const totalReembolsavel = expenseItems
            .filter(e => e.tipo === TipoDespesa.DESCARGA || e.tipo === TipoDespesa.MERCADORIA_PAGA)
            .reduce((acc, e) => acc + getVal(e), 0);

        return {
            all: allItems,
            byStatus,
            totalValue,
            totalPago,
            totalPendente,
            totalReembolsavel,
            count: allItems.length
        };
    }, [solicitacoes, filteredExpenses, dateStart, dateEnd]);

    const exportToExcel = () => {
        // Sheet 1: Operational costs per driver
        const opData = stratifiedDriverData.map(d => ({
            'Motorista': d.driver.nome,
            'Placa': d.driver.placa,
            'Faturamento': d.revenue,
            'Combustível': d.expenses[TipoDespesa.COMBUSTIVEL],
            'Alimentação': d.expenses[TipoDespesa.ALIMENTACAO],
            'Pedágio': d.expenses[TipoDespesa.PEDAGIO],
            'Chapa': d.expenses[TipoDespesa.CHAPA],
            'Pernoite': d.expenses[TipoDespesa.PERNOITE_ADMIN],
            'Manutenção': d.expenses[TipoDespesa.MANUTENCAO],
            'Lavagem': d.expenses[TipoDespesa.LAVAGEM],
            'Avaria': d.expenses[TipoDespesa.AVARIA],
            'Outros': d.expenses[TipoDespesa.OUTROS],
            'Total Operacional': d.totalExpenses,
            'Resultado Operacional': d.result,
            'Margem %': d.margin.toFixed(2) + '%'
        }));

        // Sheet 2: Fixed costs
        const fixedData = [
            ...fixedCosts.salary.map(s => ({ 'Tipo': 'Salário', 'Referência': s.name, 'Placa': s.placa, 'Valor': s.total })),
        ];

        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.json_to_sheet(opData);
        XLSX.utils.book_append_sheet(wb, ws1, 'Custos Operacionais');
        const ws2 = XLSX.utils.json_to_sheet(fixedData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Custos Fixos');
        XLSX.writeFile(wb, `Resultado_Estratificado_${dateStart}_a_${dateEnd}.xlsx`);
        onAddToast('Relatório exportado com sucesso!', 'success');
    };

    return (
        <>
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Sub-tab Navigation */}
                <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setView('analytics')}
                        className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${view === 'analytics' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <BarChart3 className="w-4 h-4" /> Analytics Financeiro
                    </button>
                    <button
                        onClick={() => setView('reimbursement')}
                        className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${view === 'reimbursement' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <Mail className="w-4 h-4" /> Gerador de Reembolso
                    </button>
                    <button
                        onClick={() => setView('results')}
                        className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${view === 'results' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <Activity className="w-4 h-4" /> Resultados Detalhados
                    </button>
                </div>

                {view === 'analytics' ? (
                    <>
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                            {/* Gross Gain */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40 relative group hover:shadow-md transition-all z-0 hover:z-10">
                                <div className="absolute inset-0 overflow-hidden rounded-2xl z-0">
                                    <div className="absolute -right-4 -top-4 bg-green-50 w-24 h-24 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <TrendingUp className="w-12 h-12 text-green-200" />
                                    </div>
                                </div>
                                <div className="p-6 relative z-10 flex flex-col justify-between h-full">
                                    <div>
                                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Faturamento Previsto</p>
                                        <h3 className="text-3xl font-bold text-gray-900">
                                            R$ {metrics.grossGain.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-green-600">
                                        <DollarSign className="w-3 h-3" />
                                        <span>KM Seara + Diárias</span>
                                    </div>
                                </div>
                                {/* Tooltip */}
                                <div className="absolute top-[80%] left-4 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                    <h4 className="text-xs font-black text-gray-400 uppercase mb-2 border-b border-gray-100 pb-1">Detalhamento</h4>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-600">Diárias:</span>
                                            <span className="font-bold text-green-600">R$ {metrics.revenueFromDiarias.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-600">KM Excedente:</span>
                                            <span className="font-bold text-green-600">R$ {metrics.revenueFromKm.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        {Math.abs(metrics.revenueGap) > 0.01 && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-400 italic">Ajuste Manual:</span>
                                                <span className="font-bold text-gray-400">R$ {metrics.revenueGap.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Expenses */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40 relative group hover:shadow-md transition-all z-0 hover:z-10">
                                <div className="absolute inset-0 overflow-hidden rounded-2xl z-0">
                                    <div className="absolute -right-4 -top-4 bg-red-50 w-24 h-24 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <TrendingDown className="w-12 h-12 text-red-200" />
                                    </div>
                                </div>
                                <div className="p-6 relative z-10 flex flex-col justify-between h-full">
                                    <div>
                                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Custos Operacionais</p>
                                        <h3 className="text-3xl font-bold text-gray-900">
                                            R$ {metrics.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-red-600">
                                        <Wallet className="w-3 h-3" />
                                        <span>Exclui Descarga (Reembolsável)</span>
                                    </div>
                                </div>
                                {/* Tooltip */}
                                <div className="absolute top-[80%] left-4 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                    <h4 className="text-xs font-black text-gray-400 uppercase mb-2 border-b border-gray-100 pb-1">Por Categoria</h4>
                                    <div className="space-y-1">
                                        {Object.entries(metrics.expenseDetails as Record<string, number>)
                                            .filter(([_, val]) => (val as number) > 0)
                                            .sort((a, b) => (b[1] as number) - (a[1] as number)) // highest first
                                            .slice(0, 5) // top 5
                                            .map(([key, val]) => (
                                                <div key={key} className="flex justify-between text-xs">
                                                    <span className="text-gray-600 capitalize">{key.toLowerCase()}:</span>
                                                    <span className="font-bold text-red-600">R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>

                            {/* Net Gain */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40 relative group hover:shadow-md transition-all z-0 hover:z-10">
                                <div className="absolute inset-0 overflow-hidden rounded-2xl z-0">
                                    <div className="absolute -right-4 -top-4 bg-blue-50 w-24 h-24 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Receipt className="w-12 h-12 text-blue-200" />
                                    </div>
                                </div>
                                <div className="p-6 relative z-10 flex flex-col justify-between h-full">
                                    <div>
                                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Resultado Líquido</p>
                                        <h3 className={`text-3xl font-bold ${metrics.netGain >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                            R$ {metrics.netGain.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-blue-500">
                                        <span className="bg-blue-50 px-2 py-1 rounded">
                                            {metrics.grossGain > 0 ? ((metrics.netGain / metrics.grossGain) * 100).toFixed(1) : 0}% Margem
                                        </span>
                                    </div>
                                </div>
                                {/* Tooltip */}
                                <div className="absolute top-[80%] left-4 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                    <h4 className="text-xs font-black text-gray-400 uppercase mb-2 border-b border-gray-100 pb-1">Cálculo</h4>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-600">Faturamento:</span>
                                            <span className="font-bold text-green-600">R$ {metrics.grossGain.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-600">Custos (-):</span>
                                            <span className="font-bold text-red-600">R$ {metrics.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="border-t border-gray-100 pt-1 flex justify-between text-xs mt-1">
                                            <span className="font-bold text-gray-900">Resultado:</span>
                                            <span className={`font-bold ${metrics.netGain >= 0 ? 'text-blue-600' : 'text-red-600'}`}>R$ {metrics.netGain.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Descarga (Reimbursement) */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40 relative group hover:shadow-md transition-all z-0 hover:z-10">
                                <div className="absolute inset-0 overflow-hidden rounded-2xl z-0">
                                    <div className="absolute -right-4 -top-4 bg-orange-50 w-24 h-24 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Truck className="w-12 h-12 text-orange-200" />
                                    </div>
                                </div>
                                <div className="p-6 relative z-10 flex flex-col justify-between h-full">
                                    <div>
                                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Reembolsável (Seara)</p>
                                        <h3 className="text-3xl font-bold text-orange-600">
                                            R$ {metrics.totalDescarga.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-orange-600">
                                        <RefreshCw className="w-3 h-3" />
                                        <span>Valor Reembolsável pela Seara</span>
                                    </div>
                                </div>
                                {/* Tooltip */}
                                <div className="absolute top-[80%] right-4 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                    <h4 className="text-xs font-black text-gray-400 uppercase mb-2 border-b border-gray-100 pb-1">Info</h4>
                                    <p className="text-gray-500 text-xs leading-relaxed">
                                        Este valor refere-se a adiantamentos de descarga que serão reembolsados pela Seara. Não entra no cálculo de custo operacional.
                                    </p>
                                </div>
                            </div>

                            {/* Mercadoria Paga Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-green-100 flex flex-col justify-between h-40 relative group hover:shadow-md transition-all z-0 hover:z-10">
                                <div className="absolute inset-0 overflow-hidden rounded-2xl z-0">
                                    <div className="absolute -right-4 -top-4 bg-green-50 w-24 h-24 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <FileText className="w-12 h-12 text-green-200" />
                                    </div>
                                </div>
                                <div className="p-6 relative z-10 flex flex-col justify-between h-full">
                                    <div>
                                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Mercadoria Paga</p>
                                        <h3 className="text-3xl font-bold text-green-600">
                                            R$ {metrics.totalMercadoriaPaga.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-green-600">
                                        <RefreshCw className="w-3 h-3" />
                                        <span>Reembolsável · Não afeta resultado</span>
                                    </div>
                                </div>
                                {/* Tooltip */}
                                <div className="absolute top-[80%] right-4 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                    <h4 className="text-xs font-black text-gray-400 uppercase mb-2 border-b border-gray-100 pb-1">Info</h4>
                                    <p className="text-gray-500 text-xs leading-relaxed">
                                        Valor adiantado pelo motorista para compra de mercadoria. É reembolsável e não entra no cálculo de custo operacional ou resultado.
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Expenses Distribution */}
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                                <h4 className="text-lg font-bold text-gray-900 mb-6">Distribuição de Gastos</h4>
                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}% `}
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell - ${index} `} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} `}
                                            />
                                            <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Revenue Performance by Category */}
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                                <h4 className="text-lg font-bold text-gray-900 mb-6">Comparativo Financeiro</h4>
                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                        <BarChart
                                            data={[
                                                { name: 'Bruto', valor: metrics.grossGain },
                                                { name: 'Gastos', valor: metrics.totalExpenses },
                                                { name: 'Líquido', valor: metrics.netGain },
                                                { name: 'Descarga', valor: metrics.totalDescarga }
                                            ]}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                            <Tooltip
                                                cursor={{ fill: '#F8FAFC' }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                formatter={(value: any) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} `}
                                            />
                                            <Bar dataKey="valor" radius={[6, 6, 0, 0]} barSize={40}>
                                                {
                                                    [0, 1, 2, 3].map((entry, index) => (
                                                        <Cell key={`cell - ${index} `} fill={index === 0 ? '#10B981' : index === 1 ? '#EF4444' : index === 2 ? '#3B82F6' : '#F59E0B'} />
                                                    ))
                                                }
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Detalhamento por Rota Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                                <div>
                                    <h4 className="text-lg font-bold text-gray-900">Detalhamento por Rota</h4>
                                    <p className="text-sm text-gray-500 mt-1">Breakdown financeiro de cada viagem realizada</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    <Activity className="w-4 h-4" />
                                    <span>{routesMetrics.length} Rotas</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Número / ID</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Faturamento</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Gastos</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Resultado</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50/50">
                                        {routesMetrics.map((route, idx) => (
                                            <tr key={route.id || idx} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <div className="font-bold text-gray-900">{route.route_number || 'N/A'}</div>
                                                    <div className="text-[10px] font-mono text-gray-400 uppercase">#{route.id?.substring(0, 8) || '---'}</div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="text-green-600 font-bold">
                                                        R$ {route.calculatedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div
                                                        className="text-red-500 font-bold opacity-80 cursor-pointer hover:underline"
                                                        onClick={() => setSelectedRouteForDetails(route.id)}
                                                    >
                                                        R$ {route.calculatedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className={`inline - flex px - 3 py - 1 rounded - full text - xs font - black uppercase tracking - tighter ${route.calculatedResult >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} `}>
                                                        R$ {route.calculatedResult.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <button className="p-2 text-gray-300 hover:text-blue-600 transition-colors">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {routesMetrics.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-8 py-12 text-center text-gray-400">
                                                    Nenhuma rota encontrada para o período selecionado.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {routesMetrics.length > 0 && (
                                        <tfoot className="bg-gray-50/80 border-t-2 border-gray-100">
                                            <tr className="font-black text-gray-900 bg-blue-50/30">
                                                <td className="px-8 py-6 uppercase tracking-tighter" colSpan={2}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                                                        Totais Consolidados
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-green-700">
                                                    <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Total Faturamento</div>
                                                    <div className="text-lg">R$ {totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                </td>
                                                <td className="px-8 py-6 text-red-600">
                                                    <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Total Gastos</div>
                                                    <div className="text-lg opacity-90">R$ {totals.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Resultado Final</div>
                                                    <div className={`inline - flex px - 4 py - 1.5 rounded - xl text - sm font - black uppercase tracking - tighter ${totals.result >= 0 ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'} `}>
                                                        R$ {totals.result.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right"></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    </>
                ) : view === 'results' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Grand Total Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-50 rounded-xl">
                                        <BarChart3 className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Receita Total</p>
                                        <h3 className="text-2xl font-black text-gray-900">R$ {grandTotals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-orange-100 shadow-sm transition-all hover:shadow-md">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-orange-50 rounded-xl">
                                        <Truck className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Custos Operacionais</p>
                                        <h3 className="text-2xl font-black text-orange-600">R$ {grandTotals.operational.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm transition-all hover:shadow-md">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-red-50 rounded-xl">
                                        <Wallet className="w-6 h-6 text-red-600" />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Custos Fixos</p>
                                        <h3 className="text-2xl font-black text-red-600">R$ {grandTotals.fixed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                                        <p className="text-[10px] text-gray-400 mt-0.5">Salário + Manutenção</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm transition-all hover:shadow-md">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-50 rounded-xl">
                                        <TrendingUp className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Resultado Real</p>
                                        <h3 className={`text - 2xl font - black ${grandTotals.result >= 0 ? 'text-blue-600' : 'text-red-600'} `}>R$ {grandTotals.result.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                                        <p className={`text - [10px] font - bold mt - 0.5 ${grandTotals.margin > 20 ? 'text-green-500' : 'text-orange-500'} `}>{grandTotals.margin.toFixed(1)}% margem</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 1: Operational Costs per Driver */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                                <div>
                                    <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Custos Operacionais por Motorista</h4>
                                    <p className="text-sm text-gray-500 mt-1">Gastos vinculados às rotas de cada motorista</p>
                                </div>
                                <button
                                    onClick={exportToExcel}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-bold hover:bg-green-100 transition-all border border-green-200"
                                >
                                    <Download className="w-4 h-4" /> Exportar Excel
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Motorista</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Faturamento</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Combustível</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Alimentação</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pedágio</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pernoite</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Chapa</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Descarga</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-orange-400 uppercase tracking-widest">Merc. Paga</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Avaria</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Outros</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Salário</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Op.</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Resultado</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Margem %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50/50">
                                        {stratifiedDriverData.map((data, idx) => (
                                            <tr key={data.driver.id || idx} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900">{data.driver.nome}</div>
                                                    <div className="text-[10px] font-mono text-gray-400 uppercase">{data.driver.placa}</div>
                                                </td>
                                                <td className="px-6 py-4 font-black text-green-700">R$ {data.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-gray-600 cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => setSelectedOperationalDrillDown({ driverId: data.driver.id, type: TipoDespesa.COMBUSTIVEL })}>R$ {data.expenses[TipoDespesa.COMBUSTIVEL].toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-gray-600 cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => setSelectedOperationalDrillDown({ driverId: data.driver.id, type: TipoDespesa.ALIMENTACAO })}>R$ {data.expenses[TipoDespesa.ALIMENTACAO].toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-gray-600 cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => setSelectedOperationalDrillDown({ driverId: data.driver.id, type: TipoDespesa.PEDAGIO })}>R$ {data.expenses[TipoDespesa.PEDAGIO].toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-gray-600 cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => setSelectedOperationalDrillDown({ driverId: data.driver.id, type: TipoDespesa.PERNOITE_ADMIN })}>R$ {data.expenses[TipoDespesa.PERNOITE_ADMIN].toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-gray-600 cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => setSelectedOperationalDrillDown({ driverId: data.driver.id, type: TipoDespesa.CHAPA })}>R$ {data.expenses[TipoDespesa.CHAPA].toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-gray-600 cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => setSelectedOperationalDrillDown({ driverId: data.driver.id, type: TipoDespesa.DESCARGA })}>R$ {data.expenses[TipoDespesa.DESCARGA].toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-orange-500 font-bold cursor-pointer hover:bg-orange-50/50 transition-colors" onClick={() => setSelectedOperationalDrillDown({ driverId: data.driver.id, type: TipoDespesa.MERCADORIA_PAGA })}>R$ {(data.expenses[TipoDespesa.MERCADORIA_PAGA] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-gray-600 cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => setSelectedOperationalDrillDown({ driverId: data.driver.id, type: TipoDespesa.AVARIA })}>R$ {data.expenses[TipoDespesa.AVARIA].toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-gray-600 cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => setSelectedOperationalDrillDown({ driverId: data.driver.id, type: TipoDespesa.OUTROS })}>R$ {data.expenses[TipoDespesa.OUTROS].toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 font-bold text-blue-600 cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => setSelectedSalaryDriver(data.driver.id)}>R$ {data.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 font-bold text-red-600 opacity-80">R$ {data.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4">
                                                    <div className={`inline-flex px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-tighter ${data.result >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                        R$ {data.result.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`font-black text-[11px] ${data.margin > 30 ? 'text-green-600' : data.margin > 15 ? 'text-blue-600' : 'text-orange-600'}`}>
                                                        {data.margin.toFixed(1)}%
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* SECTION 1b: Custo Operacional Empresa */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 bg-gradient-to-r from-indigo-50/40 to-purple-50/40">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 rounded-lg">
                                        <Factory className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-tighter">Custo Operacional Empresa</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">Lavagem · Manutenção · Chapa · Mercadoria Paga — por motorista/placa</p>
                                    </div>
                                    <div className="ml-auto text-right">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Total</p>
                                        <p className="text-base font-black text-indigo-600">R$ {(fixedCosts.totalWash + fixedCosts.totalMaintenance + fixedCosts.totalChapa + fixedCosts.totalMercadoriaPaga).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gray-50">
                                {/* Lavagem */}
                                <div>
                                    <div className="px-6 py-3 bg-blue-50/30 border-b border-blue-50 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Lavagem</span>
                                        <span className="text-xs font-black text-blue-700">R$ {fixedCosts.totalWash.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
                                        {fixedCosts.wash.length > 0 ? fixedCosts.wash.map((item, idx) => (
                                            <div key={idx} className="px-6 py-3 flex justify-between items-center hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSelectedWashVehicle(item.vehicleId)}>
                                                <div>
                                                    <div className="font-bold text-gray-900 text-sm">{item.plate}</div>
                                                    <div className="text-[10px] text-gray-400">{item.model}</div>
                                                </div>
                                                <div className="font-black text-blue-600 text-sm">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            </div>
                                        )) : (
                                            <div className="px-6 py-6 text-center text-gray-400 text-sm">Nenhum registro no período.</div>
                                        )}
                                    </div>
                                </div>
                                {/* Manutenção */}
                                <div>
                                    <div className="px-6 py-3 bg-amber-50/30 border-b border-amber-50 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Manutenção</span>
                                        <span className="text-xs font-black text-amber-700">R$ {fixedCosts.totalMaintenance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
                                        {fixedCosts.maintenance.length > 0 ? fixedCosts.maintenance.map((item, idx) => (
                                            <div key={idx} className="px-6 py-3 flex justify-between items-center hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSelectedMaintenanceVehicle(item.vehicleId)}>
                                                <div>
                                                    <div className="font-bold text-gray-900 text-sm">{item.plate}</div>
                                                    <div className="text-[10px] text-gray-400">{item.model}</div>
                                                </div>
                                                <div className="font-black text-amber-600 text-sm">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            </div>
                                        )) : (
                                            <div className="px-6 py-6 text-center text-gray-400 text-sm">Nenhum registro no período.</div>
                                        )}
                                    </div>
                                </div>
                                {/* Chapa */}
                                <div>
                                    <div className="px-6 py-3 bg-purple-50/30 border-b border-purple-50 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Chapa</span>
                                        <span className="text-xs font-black text-purple-700">R$ {fixedCosts.totalChapa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
                                        {fixedCosts.chapa.length > 0 ? fixedCosts.chapa.map((item, idx) => (
                                            <div key={idx} className="px-6 py-3 flex justify-between items-center hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => {
                                                const exp = filteredExpenses.find(e => e.id === item.expenseId);
                                                if (exp) setSelectedExpenseDetail(exp);
                                            }}>
                                                <div>
                                                    <div className="font-bold text-gray-900 text-sm">{item.plate} <span className="text-gray-400 font-medium ml-1">| {item.model}</span></div>
                                                    <div className="text-[10px] text-gray-400 font-bold">{item.date ? formatDateNoTimezone(item.date) : '-'}</div>
                                                </div>
                                                <div className="font-black text-purple-600 text-sm">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            </div>
                                        )) : (
                                            <div className="px-6 py-6 text-center text-gray-400 text-sm">Nenhum registro no período.</div>
                                        )}
                                    </div>
                                </div>
                                {/* Mercadoria Paga */}
                                <div>
                                    <div className="px-6 py-3 bg-orange-50/30 border-b border-orange-50 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Mercadoria Paga</span>
                                        <span className="text-xs font-black text-orange-700">R$ {fixedCosts.totalMercadoriaPaga.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
                                        {fixedCosts.mercadoriaPaga.length > 0 ? fixedCosts.mercadoriaPaga.map((item, idx) => (
                                            <div key={idx} className="px-6 py-3 hover:bg-orange-50/30 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div className="font-bold text-gray-900 text-sm">{item.name}</div>
                                                    <div className="font-black text-orange-600 text-sm">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                </div>
                                                {item.entries.map((entry, eIdx) => (
                                                    <div key={eIdx} className="flex justify-between items-center mt-1">
                                                        <div className="text-[10px] text-gray-400">{entry.routeNum} · {entry.date ? formatDateNoTimezone(entry.date) : '-'}</div>
                                                        <div className="text-[10px] font-bold text-orange-500">R$ {entry.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )) : (
                                            <div className="px-6 py-6 text-center text-gray-400 text-sm">Nenhum registro no período.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: Fixed Costs */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Salary by Driver */}
                            <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                                <div className="p-6 border-b border-blue-50 bg-blue-50/30">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <DollarSign className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-tighter">Salários</h4>
                                            <p className="text-xs text-gray-500">Total: <span className="font-black text-blue-600">R$ {fixedCosts.totalSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                                        </div>
                                    </div>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {fixedCosts.salary.length > 0 ? fixedCosts.salary.map((item, idx) => (
                                        <div key={idx} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSelectedSalaryDriver(item.driverId)}>
                                            <div>
                                                <div className="font-bold text-gray-900 text-sm">{item.name}</div>
                                                <div className="text-[10px] font-mono text-gray-400 uppercase">{item.placa}</div>
                                            </div>
                                            <div className="font-black text-blue-600 text-sm">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                        </div>
                                    )) : (
                                        <div className="px-6 py-8 text-center text-gray-400 text-sm">Nenhum lançamento de salário no período.</div>
                                    )}
                                </div>
                            </div>


                            {/* Damage by Driver (Avaria) */}
                            <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
                                <div className="p-6 border-b border-red-50 bg-red-50/30">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-100 rounded-lg">
                                            <AlertTriangle className="w-5 h-5 text-red-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-tighter">Avarias (Ofensores)</h4>
                                            <p className="text-xs text-gray-500">Total Ocorrências: <span className="font-black text-red-600">{fixedCosts.damage.reduce((acc, curr) => acc + curr.count, 0)}</span></p>
                                        </div>
                                    </div>
                                </div>
                                <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                                    {fixedCosts.damage.length > 0 ? fixedCosts.damage.map((item, idx) => (
                                        <div key={idx} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSelectedDamageDriver(item.driverId)}>
                                            <div>
                                                <div className="font-bold text-gray-900 text-sm">{item.name}</div>
                                                <div className="text-[10px] text-gray-400">Total Custo: R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Qtd:</span>
                                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-black">{item.count}</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="px-6 py-8 text-center text-gray-400 text-sm">Nenhuma avaria registrada no período.</div>
                                    )}
                                </div>
                            </div>





                            {/* Payments Requested */}
                            <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
                                <div className="p-6 border-b border-purple-50 bg-purple-50/30">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                            <Receipt className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-tighter">Pagamento Avulso</h4>
                                            <p className="text-xs text-gray-500">
                                                <span className="font-black text-purple-600">R$ {paymentsSummary.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                <span className="text-gray-400 ml-2">({paymentsSummary.count} solicitações)</span>
                                            </p>
                                        </div>
                                    </div>
                                    {paymentsSummary.count > 0 && (
                                        <div className="flex gap-2 mt-3 flex-wrap">
                                            {paymentsSummary.totalPendente > 0 && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                                    Pendente: R$ {paymentsSummary.totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            )}
                                            {paymentsSummary.totalPago > 0 && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                                    Pago: R$ {paymentsSummary.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            )}
                                            {paymentsSummary.totalReembolsavel > 0 && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                                    Reembolsável: R$ {paymentsSummary.totalReembolsavel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                                    {paymentsSummary.all.length > 0 ? paymentsSummary.all.map((req, idx) => {
                                        const r = req as any;
                                        const driverId = req.motoristaId || r.driver_id;
                                        const driver = drivers.find(d => d.id === driverId);
                                        const tipo = req.tipo || r.type || '';
                                        const valor = Number(req.valor ?? r.amount ?? 0);
                                        const statusColors: Record<string, string> = {
                                            [StatusSolicitacao.AGUARDANDO]: 'bg-amber-100 text-amber-700',
                                            [StatusSolicitacao.APROVADO]: 'bg-blue-100 text-blue-700',
                                            [StatusSolicitacao.PAGO]: 'bg-green-100 text-green-700',
                                            [StatusSolicitacao.RECUSADO]: 'bg-red-100 text-red-700',
                                        };
                                        return (
                                            <div key={req.id || idx} className="px-6 py-3 flex justify-between items-center hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => {
                                                const descricao = req.descricao || r.description || '';
                                                const metodo = req.metodoPagamento || r.metodo_pagamento || '';
                                                const comprovante = req.comprovanteUrl || r.comprovante_url || '';
                                                setSelectedPayment({ ...req, _driver: driver, _metodo: metodo, _tipo: tipo, _descricao: descricao, _valor: valor, _comprovante: comprovante });
                                            }}>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-gray-900 text-sm truncate">{driver?.nome || driver?.name || 'N/A'}</div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] text-gray-400">{tipo}</span>
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusColors[req.status] || 'bg-gray-100 text-gray-600'}`}>
                                                            {req.status}
                                                        </span>
                                                        {(tipo === TipoDespesa.DESCARGA || tipo === TipoDespesa.MERCADORIA_PAGA) && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">
                                                                Reembolsável
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="font-black text-purple-600 text-sm whitespace-nowrap ml-3">R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="px-6 py-8 text-center text-gray-400 text-sm">Nenhuma solicitação no período.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <UnloadingReimbursement
                        routes={routes}
                        expenses={expenses}
                        vehicles={vehicles}
                        drivers={drivers}
                        onAddToast={onAddToast}
                        onRefresh={onRefresh}
                    />
                )}
            </div>

            {/* Payment Detail Popup */}
            {
                selectedPayment && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPayment(null)}>
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-800">Detalhes do Pagamento</h3>
                                <button onClick={() => setSelectedPayment(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
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
                                            <span className={`text - xs font - bold px - 2 py - 1 rounded - full ${selectedPayment._metodo === 'PIX' ? 'bg-green-50 text-green-700' :
                                                selectedPayment._metodo === 'OxPay' ? 'bg-blue-50 text-blue-700' :
                                                    selectedPayment._metodo === 'Dinheiro' ? 'bg-amber-50 text-amber-700' :
                                                        'bg-gray-100 text-gray-600'
                                                } `}>{selectedPayment._metodo}</span>
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
                                        <p className="text-sm text-gray-900">{formatDateNoTimezone(selectedPayment.date)}</p>
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
                                            download={`comprovante_${new Date(selectedPayment.date).toLocaleDateString('pt-BR').replace(/\//g, '-')} `}
                                            className="inline-flex items-center gap-2 w-full justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm py-2.5 px-4 rounded-lg transition-colors"
                                        >
                                            <Download className="w-4 h-4" /> Baixar Comprovante
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Route Expenses Detail Popup */}
            {selectedRouteForDetails && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedRouteForDetails(null)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Detalhamento da Rota</h3>
                                <p className="text-sm text-gray-500">
                                    Rota #{selectedRouteForDetails.substring(0, 8)} - {formatDateNoTimezone(routes.find(r => r.id === selectedRouteForDetails)?.date)}
                                </p>
                            </div>
                            <button onClick={() => setSelectedRouteForDetails(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                        </div>

                        <div className="overflow-y-auto p-6">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        <th className="px-4 py-2 font-bold">Data</th>
                                        <th className="px-4 py-2 font-bold">Tipo</th>
                                        <th className="px-4 py-2 font-bold">Descrição</th>
                                        <th className="px-4 py-2 font-bold text-right">Valor</th>
                                        <th className="px-4 py-2 font-bold text-center">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {expenses
                                        .filter(e => e.rotaId === selectedRouteForDetails && e.tipo !== TipoDespesa.DESCARGA)
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map((exp, idx) => (
                                            <tr key={exp.id || idx} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedExpenseDetail(exp)}>
                                                <td className="px-4 py-3 whitespace-nowrap">{formatDateNoTimezone(exp.date)}</td>
                                                <td className="px-4 py-3">{exp.tipo}</td>
                                                <td className="px-4 py-3">{exp.observacoes || '-'}</td>
                                                <td className="px-4 py-3 text-right font-medium text-red-600">
                                                    R$ {Number(exp.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="inline-flex items-center gap-2">
                                                        <Search className="w-3 h-3 text-blue-600" />
                                                        {exp.img_url && <ImageIcon className="w-3 h-3 text-green-600" />}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    {expenses.filter(e => e.rotaId === selectedRouteForDetails && e.tipo !== TipoDespesa.DESCARGA).length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                                Nenhum gasto operacional lançado nesta rota.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0 text-right">
                            <div className="inline-block">
                                <span className="text-sm font-bold text-gray-500 mr-2">Total Gastos:</span>
                                <span className="text-lg font-black text-red-600">
                                    R$ {expenses
                                        .filter(e => e.rotaId === selectedRouteForDetails && e.tipo !== TipoDespesa.DESCARGA)
                                        .reduce((acc, curr) => acc + Number(curr.valor), 0)
                                        .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Maintenance Detail Popup */}
            {selectedMaintenanceVehicle && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedMaintenanceVehicle(null)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Detalhes de Manutenção</h3>
                                <p className="text-sm text-gray-500">
                                    {vehicles.find(v => v.id === selectedMaintenanceVehicle)?.plate || 'Veículo'} - {vehicles.find(v => v.id === selectedMaintenanceVehicle)?.model}
                                </p>
                            </div>
                            <button onClick={() => setSelectedMaintenanceVehicle(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                        </div>

                        <div className="overflow-y-auto p-6">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        <th className="px-4 py-2 font-bold">Data</th>
                                        <th className="px-4 py-2 font-bold">Descrição</th>
                                        <th className="px-4 py-2 font-bold text-right">Valor</th>
                                        <th className="px-4 py-2 font-bold text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredExpenses
                                        .filter(e => e.tipo === TipoDespesa.MANUTENCAO && e.vehicleId === selectedMaintenanceVehicle)
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map((exp, idx) => (
                                            <tr key={exp.id || idx} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedExpenseDetail(exp)}>
                                                <td className="px-4 py-3 whitespace-nowrap">{formatDateNoTimezone(exp.date)}</td>
                                                <td className="px-4 py-3">{exp.observacoes || '-'}</td>
                                                <td className="px-4 py-3 text-right font-medium text-amber-600">
                                                    R$ {Number(exp.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="inline-flex items-center gap-2">
                                                        <Search className="w-3 h-3 text-blue-600" />
                                                        {exp.img_url && <ImageIcon className="w-3 h-3 text-green-600" />}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0 text-right">
                            <div className="inline-block">
                                <span className="text-sm font-bold text-gray-500 mr-2">Total:</span>
                                <span className="text-lg font-black text-amber-600">
                                    R$ {filteredExpenses
                                        .filter(e => e.tipo === TipoDespesa.MANUTENCAO && e.vehicleId === selectedMaintenanceVehicle)
                                        .reduce((acc, curr) => acc + Number(curr.valor), 0)
                                        .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Wash Detail Popup */}
            {
                selectedWashVehicle && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedWashVehicle(null)}>
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Detalhes de Lavagem</h3>
                                    <p className="text-sm text-gray-500">
                                        {vehicles.find(v => v.id === selectedWashVehicle)?.plate || 'Veículo'} - {vehicles.find(v => v.id === selectedWashVehicle)?.model}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedWashVehicle(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                            </div>
                            <div className="overflow-y-auto p-6">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500">
                                        <tr>
                                            <th className="px-4 py-2 font-bold">Data</th>
                                            <th className="px-4 py-2 font-bold">Descrição</th>
                                            <th className="px-4 py-2 font-bold text-right">Valor</th>
                                            <th className="px-4 py-2 font-bold text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredExpenses
                                            .filter(e => e.tipo === TipoDespesa.LAVAGEM && e.vehicleId === selectedWashVehicle)
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map((exp, idx) => (
                                                <tr key={exp.id || idx} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedExpenseDetail(exp)}>
                                                    <td className="px-4 py-3 whitespace-nowrap">{formatDateNoTimezone(exp.date)}</td>
                                                    <td className="px-4 py-3">{exp.observacoes || '-'}</td>
                                                    <td className="px-4 py-3 text-right font-medium text-blue-600">
                                                        R$ {Number(exp.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="inline-flex items-center gap-2">
                                                            <Search className="w-3 h-3 text-blue-600" />
                                                            {exp.img_url && <ImageIcon className="w-3 h-3 text-green-600" />}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
                                <span className="text-sm font-bold text-gray-500 mr-2">Total:</span>
                                <span className="text-lg font-black text-blue-600">
                                    R$ {filteredExpenses
                                        .filter(e => e.tipo === TipoDespesa.LAVAGEM && e.vehicleId === selectedWashVehicle)
                                        .reduce((acc, curr) => acc + Number(curr.valor), 0)
                                        .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Salary Detail Popup */}
            {
                selectedSalaryDriver && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedSalaryDriver(null)}>
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Detalhamento de Salário</h3>
                                    <p className="text-sm text-gray-500">
                                        Motorista: {drivers.find(d => d.id === selectedSalaryDriver)?.nome}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedSalaryDriver(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                            </div>
                            <div className="overflow-y-auto p-6">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500">
                                        <tr>
                                            <th className="px-4 py-2 font-bold">Data</th>
                                            <th className="px-4 py-2 font-bold">Descrição</th>
                                            <th className="px-4 py-2 font-bold text-right">Valor</th>
                                            <th className="px-4 py-2 font-bold text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredExpenses
                                            .filter(e => e.tipo === TipoDespesa.SALARIO && e.motoristaId === selectedSalaryDriver)
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map((exp, idx) => (
                                                <tr key={exp.id || idx} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedExpenseDetail(exp)}>
                                                    <td className="px-4 py-3 whitespace-nowrap">{formatDateNoTimezone(exp.date)}</td>
                                                    <td className="px-4 py-3">{exp.observacoes || '-'}</td>
                                                    <td className="px-4 py-3 text-right font-medium text-blue-600">
                                                        R$ {Number(exp.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="inline-flex items-center gap-2">
                                                            <Search className="w-3 h-3 text-blue-600" />
                                                            {exp.img_url && <ImageIcon className="w-3 h-3 text-green-600" />}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
                                <span className="text-sm font-bold text-gray-500 mr-2">Total:</span>
                                <span className="text-lg font-black text-blue-600">
                                    R$ {filteredExpenses
                                        .filter(e => e.tipo === TipoDespesa.SALARIO && e.motoristaId === selectedSalaryDriver)
                                        .reduce((acc, curr) => acc + Number(curr.valor), 0)
                                        .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Damage Detail Popup */}
            {
                selectedDamageDriver && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDamageDriver(null)}>
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Ocorrências de Avaria</h3>
                                    <p className="text-sm text-gray-500">
                                        Motorista: {drivers.find(d => d.id === selectedDamageDriver)?.nome}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedDamageDriver(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                            </div>
                            <div className="overflow-y-auto p-6">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500">
                                        <tr>
                                            <th className="px-4 py-2 font-bold">Data</th>
                                            <th className="px-4 py-2 font-bold">Descrição</th>
                                            <th className="px-4 py-2 font-bold text-right">Valor</th>
                                            <th className="px-4 py-2 font-bold text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredExpenses
                                            .filter(e => e.tipo === TipoDespesa.AVARIA && e.motoristaId === selectedDamageDriver)
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map((exp, idx) => (
                                                <tr key={exp.id || idx} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedExpenseDetail(exp)}>
                                                    <td className="px-4 py-3 whitespace-nowrap">{formatDateNoTimezone(exp.date)}</td>
                                                    <td className="px-4 py-3">{exp.observacoes || '-'}</td>
                                                    <td className="px-4 py-3 text-right font-medium text-red-600">
                                                        R$ {Number(exp.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="inline-flex items-center gap-2">
                                                            <Search className="w-3 h-3 text-blue-600" />
                                                            {exp.img_url && <ImageIcon className="w-3 h-3 text-green-600" />}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
                                <span className="text-sm font-bold text-gray-500 mr-2">Total Avarias:</span>
                                <span className="text-lg font-black text-red-600">
                                    R$ {filteredExpenses
                                        .filter(e => e.tipo === TipoDespesa.AVARIA && e.motoristaId === selectedDamageDriver)
                                        .reduce((acc, curr) => acc + Number(curr.valor), 0)
                                        .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Operational Drill-Down Popup */}
            {
                selectedOperationalDrillDown && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOperationalDrillDown(null)}>
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Detalhamento: {selectedOperationalDrillDown.type}</h3>
                                    <p className="text-sm text-gray-500">
                                        Motorista: {drivers.find(d => d.id === selectedOperationalDrillDown.driverId)?.nome}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedOperationalDrillDown(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                            </div>
                            <div className="overflow-y-auto p-6">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500">
                                        <tr>
                                            <th className="px-4 py-2 font-bold">Data</th>
                                            <th className="px-4 py-2 font-bold">Descrição</th>
                                            <th className="px-4 py-2 font-bold text-right">Valor</th>
                                            <th className="px-4 py-2 font-bold text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredExpenses
                                            .filter(e => e.tipo === selectedOperationalDrillDown.type && e.motoristaId === selectedOperationalDrillDown.driverId)
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map((exp, idx) => (
                                                <tr key={exp.id || idx} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedExpenseDetail(exp)}>
                                                    <td className="px-4 py-3 whitespace-nowrap">{formatDateNoTimezone(exp.date)}</td>
                                                    <td className="px-4 py-3">{exp.observacoes || '-'}</td>
                                                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                                                        R$ {Number(exp.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="inline-flex items-center gap-2">
                                                            <Search className="w-3 h-3 text-blue-600" />
                                                            {exp.img_url && <ImageIcon className="w-3 h-3 text-green-600" />}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
                                <span className="text-sm font-bold text-gray-500 mr-2">Total Sub-categoria:</span>
                                <span className="text-lg font-black text-gray-800">
                                    R$ {filteredExpenses
                                        .filter(e => e.tipo === selectedOperationalDrillDown.type && e.motoristaId === selectedOperationalDrillDown.driverId)
                                        .reduce((acc, curr) => acc + Number(curr.valor), 0)
                                        .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Unified Expense Detail Modal */}
            {
                selectedExpenseDetail && (
                    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedExpenseDetail(null)}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Detalhes do Lançamento</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{selectedExpenseDetail.tipo}</p>
                                </div>
                                <button onClick={() => setSelectedExpenseDetail(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Data</p>
                                        <div className="flex items-center gap-2 text-gray-900 font-bold">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            {formatDateNoTimezone(selectedExpenseDetail.date)}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Valor</p>
                                        <div className="text-2xl font-black text-gray-900">
                                            R$ {Number(selectedExpenseDetail.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>

                                {selectedExpenseDetail.observacoes && (
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <FileText className="w-3 h-3" /> Descrição / Observações
                                        </p>
                                        <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                            {selectedExpenseDetail.observacoes}
                                        </p>
                                    </div>
                                )}

                                {selectedExpenseDetail.img_url ? (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <ImageIcon className="w-3 h-3" /> Comprovante Anexo
                                        </p>
                                        <div className="relative group">
                                            <img
                                                src={selectedExpenseDetail.img_url}
                                                alt="Comprovante"
                                                className="w-full rounded-xl border border-gray-200 shadow-sm max-h-[350px] object-contain bg-gray-50"
                                            />
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                                <a
                                                    href={selectedExpenseDetail.img_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-white text-gray-900 px-4 py-2 rounded-lg font-bold text-xs shadow-lg flex items-center gap-2 hover:scale-105 transition-transform"
                                                >
                                                    <ExternalLink className="w-4 h-4" /> Ver em Tela Cheia
                                                </a>
                                            </div>
                                        </div>
                                        <a
                                            href={selectedExpenseDetail.img_url}
                                            download={`comprovante_${selectedExpenseDetail.tipo}_${selectedExpenseDetail.date}.jpg`}
                                            className="inline-flex items-center gap-2 w-full justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3 px-4 rounded-xl transition-all shadow-md active:scale-[0.98]"
                                        >
                                            <Download className="w-4 h-4" /> Baixar Imagem do Comprovante
                                        </a>
                                    </div>
                                ) : (
                                    <div className="p-8 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400">
                                        <ImageIcon className="w-10 h-10 mb-2 opacity-20" />
                                        <p className="text-xs font-bold uppercase tracking-widest">Nenhum comprovante anexado</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
};
