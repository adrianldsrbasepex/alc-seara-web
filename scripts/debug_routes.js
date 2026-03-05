import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fapovyhykuwrdphbtrek.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcG92eWh5a3V3cmRwaGJ0cmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTI0NjUsImV4cCI6MjA4NjIyODQ2NX0.gUsCOYFVzD2fwMsbCUqa0ZYXGiVb-PQT7d_1GfaZGBQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugRoutes() {
    const target = '32478024';
    const { data } = await supabase.from('routes').select('route_number, date').eq('route_number', target);
    if (data && data.length > 0) {
        console.log('DATA_START');
        console.log('NUM:' + data[0].route_number);
        console.log('DATE_VAL:' + data[0].date);
        console.log('DATA_END');
    } else {
        console.log('NOT_FOUND');
    }
}

debugRoutes();
