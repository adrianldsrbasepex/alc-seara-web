import { supabase } from '../lib/supabase';
import { Rota } from '../types';

export const servicoRotas = {
    async obterRotas() {
        const { data, error } = await supabase
            .from('routes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data as Rota[];
    },

    async criarRota(rota: Omit<Rota, 'id'>) {
        // Enforce dual save
        const { data, error } = await supabase
            .from('routes')
            .insert(rota)
            .select()
            .single();

        if (error) throw new Error(error.message);


        return data as Rota;
    },

    async atualizarRota(id: string, updates: Partial<Rota>) {
        const { data, error } = await supabase
            .from('routes')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);


        return data as Rota;
    },

    async atualizarStatusRota(id: string, status: Rota['status']) {
        const { data, error } = await supabase
            .from('routes')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);


        return data as Rota;
    },

    async uploadFoto(file: File, path: string) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${path}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('receipts') // Assuming 'receipts' bucket exists, or change to appropriate bucket
            .upload(filePath, file);

        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error('Falha no upload da imagem');
        }

        const { data } = supabase.storage
            .from('receipts')
            .getPublicUrl(filePath);

        return data.publicUrl;
    },

    async marcarRotasComoEnviadas(ids: string[]) {
        if (ids.length === 0) return;

        const { error } = await supabase
            .from('routes')
            .update({ reimbursement_sent: true })
            .in('id', ids);

        if (error) throw new Error(error.message);

    }
};
