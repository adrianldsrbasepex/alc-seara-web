import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BROWSERLESS_TOKEN = Deno.env.get('BROWSERLESS_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
    let browser;
    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

        console.log("Conectando ao Browserless...")
        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`,
        })

        const page = await browser.newPage()
        await page.setViewport({ width: 1440, height: 900 })

        console.log("Acessando Portal Ravex...")
        await page.goto('https://app.ravex.com.br/logistica/index.vex', { waitUntil: 'domcontentloaded' })

        // Login logic
        console.log("Preenchendo credenciais...")
        await page.waitForSelector('input[type="email"]', { timeout: 10000 })
        await page.type('input[type="email"]', 'alctransportespostos@gmail.com')
        await page.type('input[type="password"]', '200824Alc.')

        console.log("Clicando em Entrar...")
        const loginBtnSelector = 'button.btn-primary, button#btnEntrar, .btn-entrar'
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => { }),
            page.click(loginBtnSelector).catch(() => page.keyboard.press('Enter'))
        ])

        console.log("Login OK. Aguardando inicialização do grid...")
        await page.waitForTimeout(2000)

        // Pegar rotas do banco que precisam ser verificadas (limitando para evitar timeout infinito no teste)
        const { data: routes } = await supabase
            .from('routes')
            .select('route_number')
            .not('route_number', 'is', null)
            .order('date', { ascending: false })
            .limit(10) // Processamos em lotes de 10 para segurança

        for (const route of (routes || [])) {
            console.log(`Buscando rota no grid: ${route.route_number}`)

            const found = await page.evaluate((id) => {
                const cleanId = id.trim()
                const cells = Array.from(document.querySelectorAll('td, div.grid-cell'))
                const target = cells.find(c => c.textContent?.trim() === cleanId)
                if (target) {
                    (target as HTMLElement).click()
                    return true
                }
                return false
            }, route.route_number)

            if (found) {
                // Pequeno delay para garantir que o clique foi processado
                await page.waitForTimeout(500)

                console.log(`Abrindo Custo Adicional para rota ${route.route_number}...`)
                await page.evaluate(() => {
                    const btn = document.getElementById('btnCustoAdicional');
                    if (btn) (btn as HTMLElement).click();
                    else {
                        // Fallback caso o ID mude
                        const buttons = Array.from(document.querySelectorAll('button, div.btn-icon, .fa-dollar-sign'))
                        const costBtn = buttons.find(b =>
                            b.textContent?.includes('$') ||
                            (b as HTMLElement).title?.toLowerCase().includes('custo adicional') ||
                            b.classList.contains('fa-dollar-sign')
                        )
                        if (costBtn) (costBtn as HTMLElement).click()
                    }
                })

                await page.waitForTimeout(1500)

                const costCount = await page.evaluate(() => {
                    // Tenta localizar o texto "Nenhum registro encontrado"
                    const pageText = document.body.innerText;
                    if (pageText.includes('Nenhum registro encontrado')) return 0;

                    // Conta linhas da tabela no painel lateral
                    // Baseado no print, procuramos por elementos dentro do container de custos
                    const gridRows = document.querySelectorAll('.grid-row, tr[role="row"]');
                    // Filtramos apenas as que parecem conter dados de custo (geralmente ignorando o header)
                    return Array.from(gridRows).filter(row => row.querySelector('td') !== null).length;
                })

                console.log(`>> Rota ${route.route_number}: ${costCount} registros encontrados.`)

                await supabase.from('ravex_automation_results').upsert({
                    route_number: route.route_number,
                    additional_costs_count: costCount,
                    last_checked_at: new Date().toISOString(),
                    status: 'synced'
                })
            }
        }

        console.log("Automação finalizada com sucesso.")
        if (browser) await browser.close()
        return new Response(JSON.stringify({ success: true, processed: routes?.length }), {
            headers: { "Content-Type": "application/json" }
        })

    } catch (err) {
        if (browser) await browser.close()
        console.error("Erro na automação:", err.message)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        })
    }
})
