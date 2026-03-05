import { ravexScraperService } from './services/ravexScraper';
import * as fs from 'fs';

async function test() {
    try {
        console.log('Starting scraper...');
        const result = await ravexScraperService.getDescargaCost('32655099');
        console.log('Result:', result);
    } catch (e: any) {
        console.error('Test failed:', e);
        fs.writeFileSync('error_stack.txt', e.stack || e.message);
    }
}

test();
