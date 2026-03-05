const https = require('https');
require('dotenv').config();

// Supabase Management API - requires service role key
// The SUPABASE_KEY in .env is the anon key — we need to try with it first
// If it fails, the user will need to add the service_role key

const SUPABASE_URL = process.env.SUPABASE_URL; // e.g. https://xxx.supabase.co
const PROJECT_REF = SUPABASE_URL.split('//')[1].split('.')[0]; // e.g. fapovyhykuwrdphbtrek
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

const users = [
    { email: 'Paulo.henrique@alcepereirafilho.com', password: '@PHenr!q2026' },
    { email: 'Bruno.andre@alcepereirafilho.com', password: '@BrAndre#26' },
    { email: 'Andre.luiz@alcepereirafilho.com', password: '@ALu1z$26' },
];

async function createUser(user) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            email: user.email,
            password: user.password,
            email_confirm: true
        });

        const options = {
            hostname: `${PROJECT_REF}.supabase.co`,
            path: '/auth/v1/admin/users',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'apikey': SERVICE_KEY,
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function main() {
    for (const u of users) {
        const result = await createUser(u);
        if (result.status === 200 || result.status === 201) {
            console.log('✅ Criado:', u.email);
        } else {
            console.log('❌ Erro', u.email, result.status, result.body?.message || result.body?.msg || JSON.stringify(result.body));
        }
    }
}

main();
