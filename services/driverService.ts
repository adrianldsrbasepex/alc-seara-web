import { supabase } from '../lib/supabase';
import { Motorista, TipoUsuario } from '../types';

export const servicoMotorista = {
    async obterMotoristas() {
        const { data, error } = await supabase
            .from('drivers')
            .select('*')
            .order('name');

        if (error) throw error;

        // Map snake_case from DB to camelCase for app
        return (data || []).map(driver => ({
            id: driver.id,
            nome: driver.name,
            email: driver.email,
            telefone: driver.phone || '',
            placa: driver.license_plate || '',
            modeloVeiculo: driver.vehicle_model || '',
            avatarUrl: driver.avatar_url,
            tipo: 'MOTORISTA' as TipoUsuario
        })) as Motorista[];
    },

    async criarMotorista(motorista: Omit<Motorista, 'id'>) {
        // Map camelCase to snake_case for Supabase
        const motoristaDb = {
            name: motorista.nome,
            email: motorista.email,
            phone: motorista.telefone,
            license_plate: motorista.placa || null,
            vehicle_model: motorista.modeloVeiculo || null,
            avatar_url: motorista.avatarUrl || null
        };

        const { data, error } = await supabase
            .from('drivers')
            .insert([motoristaDb])
            .select()
            .single();

        if (error) throw error;

        // Map snake_case back to camelCase for app
        return {
            id: data.id,
            nome: data.name,
            email: data.email,
            telefone: data.phone,
            placa: data.license_plate || '',
            modeloVeiculo: data.vehicle_model || '',
            avatarUrl: data.avatar_url,
            tipo: motorista.tipo
        } as Motorista;
    },

    async atualizarMotorista(id: string, atualizacoes: Partial<Motorista>) {
        const { data, error } = await supabase
            .from('drivers')
            .update(atualizacoes)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Motorista;
    },

    async excluirMotorista(id: string) {
        const { error } = await supabase
            .from('drivers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { sucesso: true };
    }
};

