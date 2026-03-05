import { supabase } from '../lib/supabase';
import { Despesa, SolicitacaoPagamento, FinancialClosure, TipoDespesa } from '../types';

export const servicoFinanceiro = {
    async criarDespesa(despesa: Omit<Despesa, 'id'>) {
        const despesaDb = {
            route_id: despesa.rotaId || null,
            driver_id: despesa.motoristaId || null,
            vehicle_id: despesa.vehicleId || null,
            type: despesa.tipo,
            amount: despesa.valor,
            liters: despesa.litros || null,
            date: despesa.date,
            notes: despesa.observacoes || null,
            img_url: despesa.img_url || null
        };

        const { data, error } = await supabase
            .from('expenses')
            .insert(despesaDb)
            .select()
            .single();

        if (error) throw new Error(error.message);


        return {
            id: data.id,
            rotaId: data.route_id,
            motoristaId: data.driver_id,
            vehicleId: data.vehicle_id,
            tipo: data.type,
            valor: data.amount,
            litros: data.liters,
            date: data.date,
            observacoes: data.notes,
            img_url: data.img_url,
            createdAt: data.created_at
        } as Despesa;
    },

    async obterDespesas() {
        const { data, error } = await supabase
            .from('expenses')
            .select('*');

        if (error) throw new Error(error.message);

        return (data || []).map((exp: any) => ({
            id: exp.id,
            rotaId: exp.route_id,
            motoristaId: exp.driver_id,
            vehicleId: exp.vehicle_id,
            tipo: exp.type,
            valor: exp.amount,
            litros: exp.liters,
            date: exp.date,
            observacoes: exp.notes,
            img_url: exp.img_url,
            createdAt: exp.created_at
        })) as Despesa[];
    },

    async obterSolicitacoesPagamento() {
        const { data, error } = await supabase
            .from('payment_requests')
            .select('*');

        if (error) throw new Error(error.message);

        return (data || []).map((req: any) => ({
            id: req.id,
            motoristaId: req.driver_id,
            tipo: req.type,
            valor: req.amount,
            date: req.date,
            status: req.status,
            descricao: req.description,
            metodoPagamento: req.metodo_pagamento,
            comprovanteUrl: req.comprovante_url
        })) as SolicitacaoPagamento[];
    },

    async criarSolicitacaoPagamento(solicitacao: Omit<SolicitacaoPagamento, 'id' | 'status'>) {
        const payload = {
            driver_id: solicitacao.motoristaId,
            type: solicitacao.tipo,
            amount: solicitacao.valor,
            date: solicitacao.date,
            description: solicitacao.descricao,
            metodo_pagamento: solicitacao.metodoPagamento,
            comprovante_url: solicitacao.comprovanteUrl
        };

        const { data, error } = await supabase
            .from('payment_requests')
            .insert(payload)
            .select()
            .single();

        if (error) throw new Error(error.message);


        return {
            id: data.id,
            motoristaId: data.driver_id,
            tipo: data.type,
            valor: data.amount,
            date: data.date,
            status: data.status,
            descricao: data.description,
            metodoPagamento: data.metodo_pagamento,
            comprovanteUrl: data.comprovante_url
        } as SolicitacaoPagamento;
    },

    async atualizarStatusSolicitacaoPagamento(id: string, status: SolicitacaoPagamento['status']) {
        const { data, error } = await supabase
            .from('payment_requests')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);


        return data;
    },

    async atualizarSolicitacaoPagamento(id: string, updates: Partial<SolicitacaoPagamento>) {
        const dbUpdates: any = {};
        if (updates.motoristaId !== undefined) dbUpdates.driver_id = updates.motoristaId;
        if (updates.tipo !== undefined) dbUpdates.type = updates.tipo;
        if (updates.valor !== undefined) dbUpdates.amount = updates.valor;
        if (updates.date !== undefined) dbUpdates.date = updates.date;
        if (updates.descricao !== undefined) dbUpdates.description = updates.descricao;
        if (updates.metodoPagamento !== undefined) dbUpdates.metodo_pagamento = updates.metodoPagamento;
        if (updates.comprovanteUrl !== undefined) dbUpdates.comprovante_url = updates.comprovanteUrl;
        if (updates.status !== undefined) dbUpdates.status = updates.status;

        const { data, error } = await supabase
            .from('payment_requests')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);


        return {
            id: data.id,
            motoristaId: data.driver_id,
            tipo: data.type,
            valor: data.amount,
            date: data.date,
            status: data.status,
            descricao: data.description,
            metodoPagamento: data.metodo_pagamento,
            comprovanteUrl: data.comprovante_url
        } as SolicitacaoPagamento;
    },

    async deletarSolicitacaoPagamento(id: string) {
        const { error } = await supabase
            .from('payment_requests')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);

    },

    async salvarFechamento(fechamento: Omit<FinancialClosure, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('financial_closures')
            .insert(fechamento)
            .select()
            .single();

        if (error) throw new Error(error.message);


        return data as FinancialClosure;
    },

    async obterFechamentos() {
        const { data, error } = await supabase
            .from('financial_closures')
            .select('*');

        if (error) throw new Error(error.message);
        return data as FinancialClosure[];
    },

    async obterFechamentoPorId(id: string) {
        const { data, error } = await supabase
            .from('financial_closures')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw new Error(error.message);
        return data as FinancialClosure;
    },

    async atualizarDespesa(id: string, updates: Partial<Despesa>) {
        const dbUpdates: any = {};
        if (updates.rotaId !== undefined) dbUpdates.route_id = updates.rotaId;
        if (updates.motoristaId !== undefined) dbUpdates.driver_id = updates.motoristaId;
        if (updates.vehicleId !== undefined) dbUpdates.vehicle_id = updates.vehicleId;
        if (updates.tipo !== undefined) dbUpdates.type = updates.tipo;
        if (updates.valor !== undefined) dbUpdates.amount = updates.valor;
        if (updates.litros !== undefined) dbUpdates.liters = updates.litros;
        if (updates.date !== undefined) dbUpdates.date = updates.date;
        if (updates.observacoes !== undefined) dbUpdates.notes = updates.observacoes;
        if (updates.img_url !== undefined) dbUpdates.img_url = updates.img_url;

        const { data, error } = await supabase
            .from('expenses')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);


        return {
            id: data.id,
            rotaId: data.route_id,
            motoristaId: data.driver_id,
            vehicleId: data.vehicle_id,
            tipo: data.type,
            valor: data.amount,
            litros: data.liters,
            date: data.date,
            observacoes: data.notes,
            img_url: data.img_url,
            createdAt: data.created_at
        } as Despesa;
    },

    async marcarDespesasComoEnviadas(ids: string[]) {
        if (ids.length === 0) return;

        const { error } = await supabase
            .from('expenses')
            .update({ reimbursement_sent: true })
            .in('id', ids);

        if (error) throw new Error(error.message);

    }
};

