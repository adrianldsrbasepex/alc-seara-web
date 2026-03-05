const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const users = [
    { email: 'Paulo.henrique@alcepereirafilho.com', password: '@PHenr!q2026' },
    { email: 'Bruno.andre@alcepereirafilho.com', password: '@BrAndre#26' },
    { email: 'Andre.luiz@alcepereirafilho.com', password: '@ALu1z$26' },
];

async function generate() {
    const now = new Date().toISOString();
    let sql = '-- Supabase auth.users INSERT\n\n';

    for (const u of users) {
        const hash = await bcrypt.hash(u.password, 10);
        const id = uuidv4();
        sql += `INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_app_meta_data, raw_user_meta_data)\n`;
        sql += `VALUES (\n`;
        sql += `  '${id}',\n`;
        sql += `  '${u.email}',\n`;
        sql += `  '${hash}',\n`;
        sql += `  '${now}',\n`;
        sql += `  '${now}',\n`;
        sql += `  '${now}',\n`;
        sql += `  'authenticated',\n`;
        sql += `  'authenticated',\n`;
        sql += `  '{"provider":"email","providers":["email"]}',\n`;
        sql += `  '{}'\n`;
        sql += `) ON CONFLICT (email) DO NOTHING;\n\n`;
    }

    require('fs').writeFileSync('create_supabase_users.sql', sql);
    console.log('SQL gerado: create_supabase_users.sql');
    console.log(sql);
}

generate();
