import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const placasOficiais = [
    'SEZ-8J71',
    'FRI-3B21',
    'SWQ-7I71',
    'SMS-EY19',
    'SJR-8D34',
    'RIP-1E18',
    'RIU-1I98',
    'TKE-4A87',
    'TJD-3L99',
    'TJJ-9C53',
    'TLN-9A77',
    'TMH-8B95'
];

async function adicionarVeiculos() {
    console.log('🚚 Adicionando veículos ao Supabase...\n');

    for (const placa of placasOficiais) {
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .upsert({
                    plate: placa,
                    model: 'VUC FRIGORIFICO',
                    status: 'Disponível'
                }, {
                    onConflict: 'plate'
                })
                .select()
                .single();

            if (error) {
                console.error(`❌ Erro ao adicionar ${placa}:`, error.message);
            } else {
                console.log(`✅ Veículo ${placa} adicionado com sucesso!`);
            }
        } catch (err: any) {
            console.error(`❌ Erro inesperado ao processar ${placa}:`, err.message);
        }
    }

    console.log('\n🎉 Processo concluído!');
}

adicionarVeiculos().catch(console.error);
