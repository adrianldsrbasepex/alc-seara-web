// Developer: Adrian Luciano De Sena Ribeiro - MG | Tel: 31 995347802
import { supabase } from '../lib/supabase';
import { Rota } from '../types';

export const servicoRota = {
    async obterRotas() {
        const { data, error } = await supabase
            .from('routes')
            .select(`
        *,
        driver:drivers(*)
      `)
            .order('date', { ascending: false });

        if (error) throw error;
        return data as Rota[];
    },

    async criarRota(rota: Omit<Rota, 'id'>) {
        const { data, error } = await supabase
            .from('routes')
            .insert([rota])
            .select()
            .single();

        if (error) throw error;
        return data as Rota;
    },

    async atualizarStatusRota(id: string, status: Rota['status']) {
        const { data, error } = await supabase
            .from('routes')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Rota;
    },

    async atualizarRota(id: string, dados: Partial<Rota>) {
        const { data, error } = await supabase
            .from('routes')
            .update(dados)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Rota;
    }
};

