import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

async function debugRoutes() {
    console.log('Fetching last 5 routes...');
    const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Routes found:', data.length);
    if (data) {
        data.forEach(r => {
            console.log(`ID: ${r.id} | Num: [${r.route_number}] | Date: ${r.date} | Status: ${r.status}`);
        });
    }
}

debugRoutes();
