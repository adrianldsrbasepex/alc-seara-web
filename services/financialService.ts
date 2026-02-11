// Developer: Adrian Luciano De Sena Ribeiro - MG | Tel: 31 995347802
import { supabase } from '../lib/supabase';
import { Despesa, SolicitacaoPagamento, FinancialClosure } from '../types';

export const servicoFinanceiro = {
    async criarDespesa(despesa: Omit<Despesa, 'id'>) {
        // Map camelCase to snake_case for Supabase
        const despesaDb = {
            route_id: despesa.rotaId,
            driver_id: despesa.motoristaId,
            type: despesa.tipo,
            amount: despesa.valor,
            date: despesa.date,
            notes: despesa.observacoes || null,
            img_url: despesa.img_url || null
        };

        const { data, error } = await supabase
            .from('expenses')
            .insert([despesaDb])
            .select()
            .single();

        if (error) throw error;

        // Map snake_case back to camelCase for app
        return {
            id: data.id,
            rotaId: data.route_id,
            motoristaId: data.driver_id,
            tipo: data.type,
            valor: data.amount,
            date: data.date,
            observacoes: data.notes,
            img_url: data.img_url
        } as Despesa;
    },

    async obterDespesas() {
        const { data, error } = await supabase
            .from('expenses')
            .select(`
        *,
        driver:drivers(*),
        route:routes(*)
      `)
            .order('date', { ascending: false });

        if (error) throw error;

        // Map snake_case to camelCase
        return (data || []).map(exp => ({
            id: exp.id,
            rotaId: exp.route_id,
            motoristaId: exp.driver_id,
            tipo: exp.type,
            valor: exp.amount,
            date: exp.date,
            observacoes: exp.notes,
            img_url: exp.img_url
        })) as Despesa[];
    },

    async obterSolicitacoesPagamento() {
        const { data, error } = await supabase
            .from('payment_requests')
            .select(`
        *,
        driver:drivers(*)
      `)
            .order('date', { ascending: false });

        if (error) throw error;
        return data as SolicitacaoPagamento[];
    },

    async criarSolicitacaoPagamento(solicitacao: Omit<SolicitacaoPagamento, 'id' | 'status'>) {
        const { data, error } = await supabase
            .from('payment_requests')
            .insert([solicitacao])
            .select()
            .single();

        if (error) throw error;
        return data as SolicitacaoPagamento;
    },

    async atualizarStatusSolicitacaoPagamento(id: string, status: SolicitacaoPagamento['status']) {
        const { data, error } = await supabase
            .from('payment_requests')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as SolicitacaoPagamento;
    },

    async salvarFechamento(fechamento: Omit<FinancialClosure, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('financial_closures')
            .insert([fechamento])
            .select()
            .single();

        if (error) throw error;
        return data as FinancialClosure;
    },

    async obterFechamentos() {
        const { data, error } = await supabase
            .from('financial_closures')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as FinancialClosure[];
    },

    async obterFechamentoPorId(id: string) {
        const { data, error } = await supabase
            .from('financial_closures')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as FinancialClosure;
    }
};

