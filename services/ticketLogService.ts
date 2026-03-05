import { supabase } from '../lib/supabase';

interface TicketLogEvent {
    id: string;
    plate: string;
    date: string;
    odometer: number;
    liters: number;
    amount: number;
    fuel_type: string;
}

export const ticketLogService = {
    async authenticate() {
        return "mock_token";
    },

    async fetchFuelingEvents(startDate: string, endDate: string): Promise<TicketLogEvent[]> {
        return [];
    },

    async syncTicketLogData() {
        const events = await this.fetchFuelingEvents('2024-01-01', new Date().toISOString());

        const { data: vehicles, error: vError } = await supabase
            .from('vehicles')
            .select('*');

        if (vError) {
            console.error('Failed to fetch vehicles', vError);
            return { success: false, error: 'Failed to fetch vehicles' };
        }

        let vehiclesMap: Record<string, any> = {};
        if (vehicles) {
            vehicles.forEach((v: any) => {
                vehiclesMap[v.plate] = v;
            });
        }

        let count = 0;

        for (const event of events) {
            const vehicle = vehiclesMap[event.plate];
            if (!vehicle) continue;

            let consumption = 0;
            if (vehicle.last_odometer > 0 && event.odometer > vehicle.last_odometer) {
                const distance = event.odometer - vehicle.last_odometer;
                consumption = distance / event.liters;
            }

            try {
                const expensePayload = {
                    type: 'Combustível',
                    amount: event.amount,
                    date: event.date.split('T')[0],
                    notes: `Sincronizado via Ticket Log - ${event.fuel_type}`,
                    ticket_log_id: event.id,
                    vehicle_id: vehicle.id,
                    liters: event.liters
                };

                const { data: insertedExpense, error: insertError } = await supabase
                    .from('expenses')
                    .insert(expensePayload)
                    .select()
                    .single();

                if (!insertError) {
                    count++;


                    const updatePayload: any = {
                        last_odometer: event.odometer
                    };
                    if (consumption > 0) {
                        updatePayload.average_consumption = consumption;
                    }

                    if (event.odometer > vehicle.last_odometer) {
                        await supabase
                            .from('vehicles')
                            .update(updatePayload)
                            .eq('id', vehicle.id);

                    }

                } else {
                    if (insertError.message && insertError.message.includes('duplicate')) {
                        // Ignore duplicate
                    } else {
                        console.error(`Error syncing event ${event.id}:`, insertError);
                    }
                }
            } catch (error) {
                console.error(`Error syncing event ${event.id}:`, error);
            }
        }

        return { success: true, count };
    }
};
