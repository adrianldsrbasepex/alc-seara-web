import React from 'react';
import { Motorista } from '../types';
import { Trash2, Mail, Phone, Truck } from 'lucide-react';

interface DriversViewProps {
    drivers: Motorista[];
    onDeleteDriver: (id: string) => void;
}

export const DriversView: React.FC<DriversViewProps> = ({ drivers, onDeleteDriver }) => {
    const handleDelete = (driver: Motorista) => {
        if (window.confirm(`Tem certeza que deseja excluir o motorista ${driver.nome}?`)) {
            onDeleteDriver(driver.id);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.map((driver) => (
                <div
                    key={driver.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                    <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                {driver.avatarUrl ? (
                                    <img
                                        src={driver.avatarUrl}
                                        alt={driver.nome}
                                        className="w-12 h-12 rounded-full"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                                        {driver.nome.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-bold text-gray-900">{driver.nome}</h3>
                                    <p className="text-xs text-gray-500">{driver.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(driver)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir motorista"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone className="w-4 h-4" />
                                <span>{driver.telefone || 'Não informado'}</span>
                            </div>

                            {driver.placa && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Truck className="w-4 h-4" />
                                    <span className="font-medium">{driver.placa}</span>
                                    {driver.modeloVeiculo && <span className="text-gray-400">• {driver.modeloVeiculo}</span>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {drivers.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                    Nenhum motorista cadastrado
                </div>
            )}
        </div>
    );
};
