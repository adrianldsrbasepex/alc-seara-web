// Developer: Adrian Luciano De Sena Ribeiro - MG | Tel: 31 995347802
import { supabase } from '../lib/supabase';

export interface Veiculo {
    id: string;
    plate: string;
    model: string;
    status: 'Em Rota' | 'Completa Carga' | 'Disponível' | 'Pernoite' | 'Manutenção';
    daily_rate: number;
    km_rate: number;
}

export const servicoFrota = {
    async obterVeiculos() {
        const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .order('plate');

        if (error) throw error;
        return data as Veiculo[];
    },

    async atualizarStatusVeiculo(id: string, status: Veiculo['status']) {
        const { data, error } = await supabase
            .from('vehicles')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Veiculo;
    },

    async criarVeiculo(veiculo: Omit<Veiculo, 'id'>) {
        const { data, error } = await supabase
            .from('vehicles')
            .insert(veiculo)
            .select()
            .single();

        if (error) throw error;
        return data as Veiculo;
    },

    async atualizarVeiculo(id: string, veiculo: Partial<Veiculo>) {
        const { data, error } = await supabase
            .from('vehicles')
            .update(veiculo)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Veiculo;
    },

    async adicionarVeiculosOficiais() {
        const veiculosData = [
            { plate: 'SEZ-8J71', model: 'Super Médio', daily_rate: 650.10, km_rate: 2.14 },
            { plate: 'FRI-3B21', model: 'Super Médio', daily_rate: 650.10, km_rate: 2.14 },
            { plate: 'SWQ-7I71', model: 'Super Médio', daily_rate: 650.10, km_rate: 2.14 },
            { plate: 'SJK-5E70', model: 'Super Médio', daily_rate: 650.10, km_rate: 2.14 },
            { plate: 'SJR-8D34', model: 'Super Médio', daily_rate: 650.10, km_rate: 2.14 },
            { plate: 'RIP-1E18', model: 'Super Médio (<5 Anos)', daily_rate: 593.94, km_rate: 1.63 },
            { plate: 'RIU-1I98', model: 'Médio frigorifico', daily_rate: 609.63, km_rate: 1.53 },
            { plate: 'TKE-4A57', model: 'Vuc frigorifico (<5 Anos)', daily_rate: 580.64, km_rate: 1.53 },
            { plate: 'TJD-3B96', model: 'Vuc frigorifico (<5 Anos)', daily_rate: 580.64, km_rate: 1.53 },
            { plate: 'TKR-0D94', model: 'Vuc frigorifico (<5 Anos)', daily_rate: 580.64, km_rate: 1.53 },
            { plate: 'TLN-9A77', model: 'Vuc frigorifico (<5 Anos)', daily_rate: 580.64, km_rate: 1.53 },
            { plate: 'TMH-8B95', model: 'Vuc frigorifico (<5 Anos)', daily_rate: 580.64, km_rate: 1.53 }
        ];

        const veiculos = veiculosData.map(v => ({
            ...v,
            status: 'Disponível' as const
        }));

        const { data, error } = await supabase
            .from('vehicles')
            .upsert(veiculos, { onConflict: 'plate' })
            .select();

        if (error) throw error;
        return data as Veiculo[];
    },

    // Daily Status Methods
    async obterStatusDiario(yearMonth: string) { // Format: YYYY-MM
        const year = parseInt(yearMonth.split('-')[0]);
        const month = parseInt(yearMonth.split('-')[1]);
        const startDate = `${yearMonth}-01`;
        const endDate = new Date(year, month, 1).toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('vehicle_daily_statuses')
            .select('*')
            .gte('date', startDate)
            .lt('date', endDate);

        if (error) {
            console.error('Error fetching daily statuses:', error);
            return [];
        }
        return data || [];
    },

    async upsertStatusDiario(statusData: { vehicle_id: string, date: string, status: string, status_text: string }) {
        // First check if exists for update logic if needed, but upsert handles it
        // We assume unique constraint on (vehicle_id, date)
        const { data, error } = await supabase
            .from('vehicle_daily_statuses')
            .upsert(statusData, { onConflict: 'vehicle_id,date' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

