import { supabase } from '../lib/supabase';
import { Usuario, TipoUsuario } from '../types';

export const servicoManobrista = {
    async obterManobristas() {
        const { data, error } = await supabase
            .from('shunters')
            .select('*');

        if (error) throw new Error(error.message);

        return (data || []).map((shunter: any) => ({
            id: shunter.id,
            nome: shunter.name,
            email: shunter.email,
            password: shunter.password,
            tipo: TipoUsuario.MANOBRISTA
        })) as (Usuario & { password?: string })[];
    },

    async criarManobrista(shunter: { name: string, email: string, password?: string }) {
        const { data, error } = await supabase
            .from('shunters')
            .insert(shunter)
            .select()
            .single();

        if (error) throw new Error(error.message);

        return data;
    },

    async deletarManobrista(id: string) {
        const { error } = await supabase
            .from('shunters')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);

        return true;
    },

    async buscarRotaParaVerificacao(numeroRota: string, data?: string) {
        let query = supabase
            .from('routes')
            .select('*')
            .eq('route_number', numeroRota);

        if (data) {
            query = query.eq('date', data);
        }

        const { data: routes, error } = await query.order('created_at', { ascending: false }).limit(1);

        if (error) throw new Error(error.message);
        if (!routes || routes.length === 0) return null;

        return routes[0];
    },

    async salvarVerificacao(rotaId: string, shunterId: string, photoBodyUrl: string, photoBoxesUrl: string) {
        const updates = {
            shunter_id: shunterId,
            shunter_body_photo_url: photoBodyUrl,
            shunter_boxes_photo_url: photoBoxesUrl,
            shunter_verified_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('routes')
            .update(updates)
            .eq('id', rotaId);

        if (error) throw new Error(error.message);

        return true;
    }
};
