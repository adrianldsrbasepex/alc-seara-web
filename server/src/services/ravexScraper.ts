import puppeteer from 'puppeteer';

export const ravexScraperService = {
    async getDescargaCost(routeNumber: string): Promise<{ custoAdicional: number; valorSolicitado: number }> {
        const browserlessApiKey = process.env.BROWSERLESS_API_KEY || '2U2nGoVdomzxXEfc3cda872d8a92c2e7f92bbf608262b9dbe';

        console.log('[Ravex Scraper] Connecting to Browserless.io...');
        const browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${browserlessApiKey}`,
        });

        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1366, height: 768 });

            // 1. Go to Login Page
            await page.goto('https://app.ravex.com.br/logistica/index.vex', { waitUntil: 'domcontentloaded', timeout: 60000 });
            await new Promise(r => setTimeout(r, 2000));
            await page.screenshot({ path: 'debug_1_login.png' });

            // 2. Perform Login
            await page.type('input[type="email"]', 'alctransportespostos@gmail.com');
            await page.type('input[type="password"]', '200824Alc.');

            // Wait for login button and click it
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn'));
                const loginBtn = buttons.find(b => b.textContent?.toLowerCase().includes('entrar') || (b as HTMLInputElement).value?.toLowerCase().includes('entrar'));
                if (loginBtn) (loginBtn as HTMLElement).click();
            });
            await new Promise(r => setTimeout(r, 5000));
            await page.screenshot({ path: 'debug_2_after_login.png' });

            // Wait for dashboard to load (wait for search bar or some specific element)
            await page.waitForSelector('.icon-cabecalho', { timeout: 15000 }).catch(() => { });

            // Wait for things to settle
            await new Promise(r => setTimeout(r, 3000));

            // 3. Filter the grid by Route Number (IDENTIFICADOR)
            const gridFiltered = await page.evaluate((rNum) => {
                // Find "IDENTIFICADOR" column
                const ths = Array.from(document.querySelectorAll('th'));
                const idCol = ths.find(th =>
                    th.textContent?.trim().toUpperCase().includes('IDENTIFICADOR') ||
                    th.getAttribute('data-title')?.toUpperCase().includes('IDENTIFICADOR')
                );

                if (!idCol) return false;

                // Click its filter icon
                const filterIcon = idCol.querySelector('.k-grid-filter, [title="Filter"], [title="Filtrar"]');
                if (filterIcon) {
                    (filterIcon as HTMLElement).click();
                    return true;
                }
                return false;
            }, routeNumber);

            if (!gridFiltered) {
                throw new Error('Não foi possível encontrar a coluna IDENTIFICADOR para filtrar.');
            }

            await new Promise(r => setTimeout(r, 2000));
            // Wait for the popup menu to appear and type the value
            await page.evaluate((rNum) => {
                // Find inputs inside k-animation-container or k-popup
                const inputs = Array.from(document.querySelectorAll('.k-animation-container input[type="text"], .k-popup input[type="text"], form.k-filter-menu input[type="text"]'));
                for (let input of inputs) {
                    // Type the number (React/Puppeteer sometimes misses this if typed via evaluate, but let's just set value)
                    const el = input as HTMLInputElement;
                    el.value = rNum;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }

                // Click "Filtrar" button
                const filterBtns = Array.from(document.querySelectorAll('.k-animation-container button, .k-popup button, form.k-filter-menu button'));
                const submitBtn = filterBtns.find(b => b.textContent?.toLowerCase().includes('filtrar') || (b.getAttribute('type') === 'submit'));
                if (submitBtn) (submitBtn as HTMLElement).click();
            }, routeNumber);

            await new Promise(r => setTimeout(r, 4000));

            // Select the row in the grid before clicking the cost icon? Or the cost icon is always visible in the toolbar?
            // The blue vertical toolbar in the middle has the $ icon. Usually you click the row in the left grid, THEN click the $ icon.
            await page.evaluate(() => {
                const rows = document.querySelectorAll('.k-grid-content tbody tr');
                if (rows.length > 0) {
                    (rows[0] as HTMLElement).click();
                }
            });
            await new Promise(r => setTimeout(r, 2000));

            // 6. Find and click the 'Custo Adicional' icon ('$')
            const clickedCost = await page.evaluate(() => {
                const icons = Array.from(document.querySelectorAll('i, span, div'));
                // The icon often has class like 'k-icon' or inline style, or a tooltip "Custo adicional/descarga"
                const costIcon = icons.find(i => {
                    const title = i.getAttribute('title') || '';
                    const dataTitle = i.getAttribute('data-title') || '';
                    return title.toLowerCase().includes('custo') || dataTitle.toLowerCase().includes('custo') || i.innerHTML.includes('$');
                });

                if (costIcon && costIcon.parentElement) {
                    costIcon.parentElement.click();
                    return true;
                }
                return false;
            });

            if (!clickedCost) {
                throw new Error('Não foi possível encontrar o ícone de Custo Adicional ($) na viagem pesquisada.');
            }

            // 7. Wait for the Cost Grid to load
            await new Promise(r => setTimeout(r, 4000));

            // 8. Extract the costs from the table
            const data = await page.evaluate(() => {
                let custoAdicional = 0;
                let valorSolicitado = 0;

                // Try to find headers
                const headers = Array.from(document.querySelectorAll('th')).map(th => th.textContent?.trim().toUpperCase());
                const vlSolicitadoIdx = headers.findIndex(h => h?.includes('VALOR SOLICITADO') || h?.includes('VALOR'));

                // Find rows in the active grid
                const rows = Array.from(document.querySelectorAll('.k-grid-content tr, tbody tr'));

                for (const row of rows) {
                    const cells = Array.from(row.querySelectorAll('td'));
                    const textContent = row.textContent?.toLowerCase() || '';

                    if (textContent.includes('descarga')) {
                        // Extract values. Assuming CUSTO ADICIONAL might be fixed or listed, but we definitely want 'Valor Solicitado'
                        if (vlSolicitadoIdx !== -1 && cells.length > vlSolicitadoIdx) {
                            const valStr = cells[vlSolicitadoIdx].textContent || '0';
                            valorSolicitado = parseFloat(valStr.replace(/[R$\s.]/g, '').replace(',', '.'));
                        } else {
                            // Fallback: search for R$ patterns
                            const match = textContent.match(/r\$\s*([\d.,]+)/);
                            if (match) {
                                valorSolicitado = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
                            }
                        }
                        // In Ravex context for this usecase, Custo Adicional usually mirrors the requested value for Descarga if not specified otherwise
                        custoAdicional = valorSolicitado;
                        break;
                    }
                }

                return { custoAdicional, valorSolicitado };
            });

            return data;
        } catch (error) {
            console.error('Scraper error occurred, taking screenshot...', error);
            try {
                const pages = await browser.pages();
                if (pages.length > 0) {
                    await pages[0].screenshot({ path: 'error.png', fullPage: true });
                    console.error('Screenshot saved as error.png');
                }
            } catch (screenshotError) {
                console.error('Failed to take error screenshot:', screenshotError);
            }
            throw error;
        } finally {
            await browser.close().catch(() => { });
        }
    }
};
