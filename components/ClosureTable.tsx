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
    val_total: number;

    status: 'Ok' | 'Sem Rota' | 'Sem Veículo';
}

interface ClosureTableProps {
    rows: MergedClosureRow[];
    onSave?: (data: MergedClosureRow[]) => void;
    readOnly?: boolean;
}

export const ClosureTable: React.FC<ClosureTableProps> = ({ rows, onSave, readOnly = false }) => {
    // ClosureTable now accepts rows directly
    // Logic for generating rows is moved to parent (AdminPanel)

    const handleKmSearaChange = (index: number, value: string) => {
        const floatVal = parseFloat(value) || 0;
        // We need to update the specific row in the parent's state
        // Create a copy of the row with the new value
        const updatedRow = { ...rows[index], km_seara: floatVal };

        // Create a new array with the updated row
        const newRows = [...rows];
        newRows[index] = updatedRow;

        onSave(newRows); // Using onSave as a generic "onUpdate" for now or we should add a specific onRowUpdate prop. 
        // To follow the plan, I will use onSave to propagate changes up, 
        // but typically `onSave` implies a final action. 
        // Let's assume onSave updates the parent state for now as "onRowsUpdate".
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

    const [statusFilter, setStatusFilter] = useState<string>('all');

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
                        onChange={(e) => setStatusFilter(e.target.value)}
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
                            <th className="px-4 py-3 text-right">KM Real</th>
                            <th className="px-4 py-3 text-right text-blue-700 bg-blue-50">KM Seara (Edit)</th>
                            <th className="px-4 py-3 text-right">Valor KM (Seara)</th>
                            <th className="px-4 py-3 text-right">Valor KM (Perdido)</th>
                            <th className="px-4 py-3 text-right">Descarga</th>
                            <th className="px-4 py-3 text-right">Valor Diária</th>
                            <th className="px-4 py-3 text-right">Valor Total</th>
                            <th className="px-4 py-3 text-blue-700 bg-blue-50">Data Pgto (Edit)</th>
                            <th className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredRows.map((row, index) => {
                            const km_rate = row.vehicle?.km_rate || 0;

                            // Calculations
                            const val_km_seara = row.km_seara * km_rate;
                            const val_total_km_real = row.km_real * km_rate;
                            const val_km_perdido = Math.max(0, val_total_km_real - val_km_seara);

                            const val_total = row.daily_rate + val_km_seara + row.descarga;

                            return (
                                <tr key={`${row.route_number}-${index}`} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">{row.vehicle?.model || '-'}</td>
                                    <td className="px-4 py-3 font-mono">{row.route_number}</td>
                                    <td className="px-4 py-3">
                                        <span className="font-medium bg-gray-100 px-2 py-1 rounded text-gray-700">
                                            {row.vehicle?.plate || '-'}
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
                                    <td className="px-4 py-3 text-right text-green-700">
                                        R$ {val_km_seara.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-right text-red-500 font-medium">
                                        R$ {val_km_perdido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        R$ {row.descarga.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        R$ {row.daily_rate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-900 border-l border-gray-100 bg-gray-50/50">
                                        R$ {val_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                        <span className="text-gray-500 mr-2">Total Descarga:</span>
                        <span className="font-bold text-gray-900">
                            R$ {rows.reduce((sum, r) => sum + r.descarga, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="bg-white px-3 py-2 rounded border border-gray-200 shadow-sm">
                        <span className="text-gray-500 mr-2">Total Geral:</span>
                        <span className="font-bold text-gray-900">
                            R$ {rows.reduce((sum, r) => sum + (r.daily_rate + (r.km_seara * (r.vehicle?.km_rate || 0)) + r.descarga), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
