import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''; // Fallback to anon if service not found, though service key is better for admin tasks if RLS is strict.

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables. Please check your .env file.');
    process.exit(1);
}

// Initializing Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const newAdmin = {
    email: 'paulo.giussulio@alcepereirafilho.com.br',
    password: '@621Jh2#*&'
};

async function createAdminUser() {
    console.log(`👤 Creating admin user: ${newAdmin.email}...`);

    try {
        // Check if user already exists
        const { data: existingUser, error: searchError } = await supabase
            .from('admins')
            .select('*')
            .eq('email', newAdmin.email)
            .single();

        if (existingUser) {
            console.log('⚠️  User already exists. Updating password...');
            const { error: updateError } = await supabase
                .from('admins')
                .update({ password: newAdmin.password })
                .eq('email', newAdmin.email);

            if (updateError) {
                throw new Error(`Failed to update password: ${updateError.message}`);
            }
            console.log('✅ Password updated successfully!');
        } else {
            // Insert new user
            const { error: insertError } = await supabase
                .from('admins')
                .insert([newAdmin]);

            if (insertError) {
                throw new Error(`Failed to create user: ${insertError.message}`);
            }
            console.log('✅ Admin user created successfully!');
        }

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

createAdminUser();
