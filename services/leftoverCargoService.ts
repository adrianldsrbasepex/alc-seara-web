import { supabase } from '../lib/supabase';

export interface LeftoverCargo {
    id: string;
    route_id: string;
    driver_id: string;
    box_number: number;
    photo_url: string;
    notes?: string;
    created_at: string;
}

export const leftoverCargoService = {
    async createLeftoverCargo(data: {
        routeId: string;
        driverId: string;
        boxNumber: number;
        photoUrl: string;
        notes?: string;
    }) {
        const { data: result, error } = await supabase
            .from('leftover_cargo')
            .insert([{
                route_id: data.routeId,
                driver_id: data.driverId,
                box_number: data.boxNumber,
                photo_url: data.photoUrl,
                notes: data.notes || null
            }])
            .select()
            .single();

        if (error) throw error;
        return result as LeftoverCargo;
    },

    async createMultipleLeftoverCargo(items: {
        routeId: string;
        driverId: string;
        boxNumber: number;
        photoUrl: string;
        notes?: string;
    }[]) {
        const records = items.map(item => ({
            route_id: item.routeId,
            driver_id: item.driverId,
            box_number: item.boxNumber,
            photo_url: item.photoUrl,
            notes: item.notes || null
        }));

        const { data, error } = await supabase
            .from('leftover_cargo')
            .insert(records)
            .select();

        if (error) throw error;
        return data as LeftoverCargo[];
    },

    async getLeftoverCargoByRoute(routeId: string) {
        const { data, error } = await supabase
            .from('leftover_cargo')
            .select('*')
            .eq('route_id', routeId)
            .order('box_number', { ascending: true });

        if (error) throw error;
        return data as LeftoverCargo[];
    }
};
