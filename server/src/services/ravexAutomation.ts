import pool from '../db';
import { ravexScraperService } from './ravexScraper';

export const ravexAutomationService = {
    isRunning: false,

    async run() {
        if (this.isRunning) {
            console.log('[Ravex Automation] Already running, skipping this tick.');
            return;
        }

        this.isRunning = true;
        console.log('[Ravex Automation] Starting automatic sync job...');

        try {
            // Find 5 routes that are 'Em Andamento' or 'Finalizada',
            // and have a 'route_number',
            // and either aren't in ravex_automation_results OR were last checked more than 4 hours ago.
            const query = `
                SELECT r.id, r.route_number
                FROM routes r
                LEFT JOIN ravex_automation_results ar ON r.route_number = ar.route_number
                WHERE r.status IN ('Em Andamento', 'Finalizada')
                  AND r.route_number IS NOT NULL
                  AND r.route_number != ''
                  AND (ar.last_checked_at IS NULL OR ar.last_checked_at < DATE_SUB(NOW(), INTERVAL 4 HOUR))
                ORDER BY r.date DESC
                LIMIT 5
            `;

            const [routesToSync]: any = await pool.query(query);

            if (routesToSync.length === 0) {
                console.log('[Ravex Automation] No routes need syncing at this time.');
                this.isRunning = false;
                return;
            }

            console.log(`[Ravex Automation] Found ${routesToSync.length} routes to sync. Processing...`);

            for (const route of routesToSync) {
                const routeNumber = route.route_number;
                console.log(`[Ravex Automation] Syncing route ${routeNumber}...`);

                try {
                    const data = await ravexScraperService.getDescargaCost(routeNumber);

                    // Upsert into ravex_automation_results
                    const upsertQuery = `
                        INSERT INTO ravex_automation_results (id, route_number, additional_costs_count, raw_data, status, last_checked_at)
                        VALUES (UUID(), ?, 1, ?, 'success', NOW())
                        ON DUPLICATE KEY UPDATE 
                            raw_data = VALUES(raw_data), 
                            status = VALUES(status), 
                            last_checked_at = VALUES(last_checked_at);
                    `;

                    await pool.query(upsertQuery, [routeNumber, JSON.stringify(data)]);
                    console.log(`[Ravex Automation] Successfully synced route ${routeNumber}: R$ ${data.valorSolicitado}`);
                } catch (error: any) {
                    console.error(`[Ravex Automation] Error syncing route ${routeNumber}:`, error.message);

                    const errorQuery = `
                        INSERT INTO ravex_automation_results (id, route_number, additional_costs_count, raw_data, status, last_checked_at)
                        VALUES (UUID(), ?, 0, ?, 'error', NOW())
                        ON DUPLICATE KEY UPDATE 
                            raw_data = VALUES(raw_data), 
                            status = VALUES(status), 
                            last_checked_at = VALUES(last_checked_at);
                    `;
                    await pool.query(errorQuery, [routeNumber, JSON.stringify({ error: error.message })]);
                }
            }

            console.log('[Ravex Automation] Sync job finished.');
        } catch (error) {
            console.error('[Ravex Automation] Fatal error during job execution:', error);
        } finally {
            this.isRunning = false;
        }
    },

    start() {
        console.log('[Ravex Automation] Scheduling background sync every 10 minutes.');
        // Run once immediately on start after 10 seconds to not block startup
        setTimeout(() => this.run(), 10000);

        // 10 minutes in milliseconds
        setInterval(() => this.run(), 10 * 60 * 1000);
    }
};
