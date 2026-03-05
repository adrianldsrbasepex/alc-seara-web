import React, { useState, useEffect } from 'react';
import { ClosureData } from '../services/spreadsheetService';
import { Rota, Veiculo } from '../types';
import { Save, AlertTriangle } from 'lucide-react';

export interface MergedClosureRow {
    route_number: string;
    route_id?: string;
    vehicle?: Veiculo;
    payment_date: string;

    // Calculated/Db values
    km_real: number;
    km_seara: number; // Editable
    descarga: number;
    daily_rate: number;

    // Dynamic values (getters or calculated on render)
    val_km_seara: number;
    val_km_perdido: number;
    val_total_seara?: number;
    val_total_alc?: number;
    val_total: number;

    status: 'Ok' | 'Sem Rota' | 'Sem Veículo';
}

interface ClosureTableProps {
    rows: MergedClosureRow[];
    onSave?: (data: MergedClosureRow[]) => void;
    readOnly?: boolean;
    statusFilter?: string;
    onStatusFilterChange?: (status: string) => void;
}

const safeNum = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const n = parseFloat(String(val).replace(',', '.'));
    return isNaN(n) ? 0 : n;
};

export const ClosureTable: React.FC<ClosureTableProps> = ({
    rows,
    onSave,
    readOnly = false,
    statusFilter = 'all',
    onStatusFilterChange
}) => {
    // ClosureTable now accepts rows directly
    // Logic for generating rows is moved to parent (AdminPanel)

    const handleKmSearaChange = (index: number, value: string) => {
        const floatVal = parseFloat(value) || 0;
        const updatedRow = { ...rows[index], km_seara: floatVal };
        const newRows = [...rows];
        newRows[index] = updatedRow;
        onSave?.(newRows);
    };

    const handleDescargaChange = (index: number, value: string) => {
        const floatVal = parseFloat(value) || 0;
        const updatedRow = { ...rows[index], descarga: floatVal };
        const newRows = [...rows];
        newRows[index] = updatedRow;
        onSave?.(newRows);
    };

    const handlePaymentDateChange = (value: string) => {
        if (!value) return;

        // When one date is changed, update ALL rows as requested by user
        const newRows = rows.map(row => ({
            ...row,
            payment_date: value
        }));

        onSave?.(newRows);
    };


    const filteredRows = rows.filter(row => {
        if (statusFilter === 'all') return true;
        return row.status === statusFilter;
    }).sort((a, b) => {
        // Sort by status priority: Issues first, then OK
        if (a.status !== 'Ok' && b.status === 'Ok') return -1;
        if (a.status === 'Ok' && b.status !== 'Ok') return 1;
        return 0;
    });

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-gray-900">Pré-visualização do Fechamento</h3>
                    <select
                        value={statusFilter}
                        onChange={(e) => onStatusFilterChange?.(e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Todos os Status</option>
                        <option value="Ok">Ok ({rows.filter(r => r.status === 'Ok').length})</option>
                        <option value="Sem Rota">Sem Rota ({rows.filter(r => r.status === 'Sem Rota').length})</option>
                        <option value="Sem Veículo">Sem Veículo ({rows.filter(r => r.status === 'Sem Veículo').length})</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                        <tr>
                            <th className="px-4 py-3">Tipo Veículo</th>
                            <th className="px-4 py-3">Identificador</th>
                            <th className="px-4 py-3">Placa</th>
                            <th className="px-4 py-3 text-center">Consumo (KM/L)</th>
                            <th className="px-4 py-3 text-right">KM Real</th>
                            <th className="px-4 py-3 text-right text-blue-700 bg-blue-50">KM Seara (Edit)</th>
                            <th className="px-4 py-3 text-right text-blue-700 bg-blue-50">Descarga (Edit)</th>
                            <th className="px-4 py-3 text-right">Valor KM (Seara)</th>
                            <th className="px-4 py-3 text-right">Valor KM (Perdido)</th>
                            <th className="px-4 py-3 text-right">Valor Diária</th>
                            <th className="px-4 py-3 text-right text-gray-900 border-l border-gray-100 bg-gray-50/50">Valor total (Seara)</th>
                            <th className="px-4 py-3 text-right font-bold text-gray-900 border-l border-gray-100 bg-gray-50/50">Valor Total (esperado ALC)</th>
                            <th className="px-4 py-3 text-blue-700 bg-blue-50">Data Pagamento</th>
                            <th className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredRows.map((row, index) => {
                            const km_rate = safeNum(row.vehicle?.km_rate);

                            // Calculations
                            const val_km_seara = safeNum(row.km_seara) * km_rate;
                            const val_total_km_real = safeNum(row.km_real) * km_rate;
                            const val_km_perdido = Math.max(0, val_total_km_real - val_km_seara);

                            const val_total_seara = (row.val_total_seara || 0) + safeNum(row.descarga);
                            const val_total_alc = safeNum(row.daily_rate) + val_km_seara + safeNum(row.descarga);

                            return (
                                <tr key={`${row.route_number}-${index}`} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">{row.vehicle?.model || '-'}</td>
                                    <td className="px-4 py-3 font-mono">{row.route_number}</td>
                                    <td className="px-4 py-3">
                                        <span className="font-medium bg-gray-100 px-2 py-1 rounded text-gray-700">
                                            {row.vehicle?.plate || '-'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-xs font-bold ${row.vehicle?.average_consumption ? 'text-orange-600' : 'text-gray-300'}`}>
                                            {row.vehicle?.average_consumption ? `${row.vehicle.average_consumption.toFixed(2)}` : '-'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">{row.km_real.toLocaleString('pt-BR')} km</td>
                                    <td className="px-4 py-3 text-right bg-blue-50/50">
                                        {readOnly ? (
                                            <span className="font-bold text-blue-700">{row.km_seara} km</span>
                                        ) : (
                                            <input
                                                type="number"
                                                value={row.km_seara}
                                                onChange={(e) => {
                                                    const originalIndex = rows.findIndex(r => r === row);
                                                    if (originalIndex !== -1) {
                                                        handleKmSearaChange(originalIndex, e.target.value);
                                                    }
                                                }}
                                                className="w-24 text-right px-2 py-1 border border-blue-200 rounded text-blue-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right bg-blue-50/50">
                                        {readOnly ? (
                                            <span className="font-bold text-blue-700">R$ {row.descarga.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        ) : (
                                            <input
                                                type="number"
                                                value={row.descarga}
                                                onChange={(e) => {
                                                    const originalIndex = rows.findIndex(r => r === row);
                                                    if (originalIndex !== -1) {
                                                        handleDescargaChange(originalIndex, e.target.value);
                                                    }
                                                }}
                                                className="w-24 text-right px-2 py-1 border border-blue-200 rounded text-blue-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right text-green-700">
                                        R$ {val_km_seara.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-right text-red-500 font-medium">
                                        R$ {val_km_perdido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        R$ {row.daily_rate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-900 border-l border-gray-100 bg-gray-50/50">
                                        R$ {val_total_seara.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-900 border-l border-gray-100 bg-gray-50/50">
                                        R$ {val_total_alc.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 bg-blue-50/50">
                                        {readOnly ? (
                                            <span className="text-gray-500">{new Date(row.payment_date).toLocaleDateString('pt-BR')}</span>
                                        ) : (
                                            <input
                                                type="date"
                                                value={row.payment_date ? row.payment_date.split('T')[0] : ''}
                                                onChange={(e) => handlePaymentDateChange(e.target.value)}
                                                className="px-2 py-1 border border-blue-200 rounded text-blue-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {row.status === 'Ok' ? (
                                            <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Ok</span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                                                <AlertTriangle className="w-3 h-3" />
                                                {row.status}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100">
                <div className="flex gap-4 text-sm">
                    <div className="bg-white px-3 py-2 rounded border border-gray-200 shadow-sm">
                        <span className="text-gray-500 mr-2">Total Seara:</span>
                        <span className="font-bold text-gray-900">
                            R$ {rows.reduce((sum, r) => sum + safeNum(r.descarga), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="bg-white px-3 py-2 rounded border border-gray-200 shadow-sm">
                        <span className="text-gray-500 mr-2">Total Esperado ALC:</span>
                        <span className="font-bold text-gray-900">
                            R$ {rows.filter(r => statusFilter === 'all' || r.status === statusFilter).reduce((sum, r) => {
                                const rate = safeNum(r.vehicle?.km_rate);
                                const kmVal = safeNum(r.km_seara) * rate;
                                return sum + (safeNum(r.daily_rate) + kmVal + safeNum(r.descarga));
                            }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
