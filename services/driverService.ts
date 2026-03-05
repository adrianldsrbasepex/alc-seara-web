import { supabase } from '../lib/supabase';
import { Motorista, TipoUsuario } from '../types';

export const servicoMotorista = {
    async obterMotoristas() {
        const { data, error } = await supabase
            .from('drivers')
            .select('*');

        if (error) throw new Error(error.message);

        return (data || []).map((driver: any) => ({
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
        const payload = {
            name: motorista.nome,
            email: motorista.email,
            phone: motorista.telefone,
            license_plate: motorista.placa,
            vehicle_model: motorista.modeloVeiculo,
            avatar_url: motorista.avatarUrl
        };

        const { data, error } = await supabase
            .from('drivers')
            .insert(payload)
            .select()
            .single();

        if (error) throw new Error(error.message);


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
        const payload: any = {};
        if (atualizacoes.nome !== undefined) payload.name = atualizacoes.nome;
        if (atualizacoes.email !== undefined) payload.email = atualizacoes.email;
        if (atualizacoes.telefone !== undefined) payload.phone = atualizacoes.telefone;
        if (atualizacoes.placa !== undefined) payload.license_plate = atualizacoes.placa;
        if (atualizacoes.modeloVeiculo !== undefined) payload.vehicle_model = atualizacoes.modeloVeiculo;
        if (atualizacoes.avatarUrl !== undefined) payload.avatar_url = atualizacoes.avatarUrl;

        const { data, error } = await supabase
            .from('drivers')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);


        return {
            id: data.id,
            nome: data.name,
            email: data.email,
            telefone: data.phone,
            placa: data.license_plate || '',
            modeloVeiculo: data.vehicle_model || '',
            avatarUrl: data.avatar_url,
            tipo: 'MOTORISTA'
        } as Motorista;
    },

    async excluirMotorista(id: string) {
        const { error } = await supabase
            .from('drivers')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);


        return { sucesso: true };
    }
};

