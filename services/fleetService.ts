import { supabase } from '../lib/supabase';
import { Veiculo, VehicleDailyStatus } from '../types';

export const servicoFrota = {
    async obterVeiculos() {
        const { data, error } = await supabase
            .from('vehicles')
            .select('*');

        if (error) throw new Error(error.message);
        return data as Veiculo[];
    },

    async atualizarStatusVeiculo(id: string, status: Veiculo['status']) {
        const { data, error } = await supabase
            .from('vehicles')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);


        return data as Veiculo;
    },

    async criarVeiculo(veiculo: Omit<Veiculo, 'id'>) {
        const { data, error } = await supabase
            .from('vehicles')
            .insert(veiculo)
            .select()
            .single();

        if (error) throw new Error(error.message);


        return data as Veiculo;
    },

    async atualizarVeiculo(id: string, veiculo: Partial<Veiculo>) {
        const { data, error } = await supabase
            .from('vehicles')
            .update(veiculo)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);


        return data as Veiculo;
    },

    async adicionarVeiculosOficiais() {
        console.warn('adicionarVeiculosOficiais is deprecated. Use database seeding.');
        return [];
    },

    // Daily Status Methods
    async obterStatusDiario(yearMonth: string) {
        // yearMonth format: YYYY-MM
        const startOfMonth = `${yearMonth}-01`;
        const endOfMonth = `${yearMonth}-31`;

        const { data, error } = await supabase
            .from('vehicle_daily_status')
            .select('*')
            .gte('date', startOfMonth)
            .lte('date', endOfMonth);

        if (error) throw new Error(error.message);
        return data as VehicleDailyStatus[];
    },

    async upsertStatusDiario(statusData: { vehicle_id: string, date: string, status: string, status_text: string }) {
        const { data, error } = await supabase
            .from('vehicle_daily_status')
            .upsert(statusData, { onConflict: 'vehicle_id,date' })
            .select()
            .single();

        if (error) throw new Error(error.message);


        return data;
    }
};

