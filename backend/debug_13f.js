const holdingsParser = require('./services/holdingsParser');
const sec13fService = require('./services/sec13fService');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function debug() {
    const cik = '0001350694'; // Bridgewater
    console.log(`Debugging for CIK: ${cik}`);

    try {
        // 1. Fetch recent filings
        console.log('Fetching filings...');
        const filings = await sec13fService.fetch13FFilings(cik);

        if (!filings || filings.length === 0) {
            console.log('No filings found.');
            return;
        }

        const latestFiling = filings[0];
        console.log('Latest Filing:', latestFiling);

        // 2. Clear cache for this accession to force re-fetch
        console.log(`Clearing cache for ${latestFiling.accessionNumber}...`);
        // We need to access the db directly or add a method. 
        // For this script, let's just use the dbService if it exposed a delete method, 
        // but since it doesn't, we'll rely on the parser to overwrite if we force it? 
        // Actually, the parser checks cache first. 
        // Let's manually delete the file or just use a hack.
        // Better: let's just modify the parser to accept a 'force' flag or 
        // for this debug script, we can just delete the cache entry using sqlite directly if we had the handle.
        // Since we don't, let's just assume the user will restart the server or we can just 
        // manually run a sqlite command.

        // Alternative: We can just use the dbService to overwrite with null? No.
        // Let's use the sqlite3 library directly here to delete.
        const dbPath = path.join(__dirname, 'data/trackmarket.db');
        const db = new sqlite3.Database(dbPath);

        await new Promise((resolve) => {
            db.run('DELETE FROM holdings_cache WHERE accession_number = ?', [latestFiling.accessionNumber], (err) => {
                if (err) console.error('Error clearing cache:', err);
                else console.log('Cache cleared.');
                resolve();
            });
        });

        // 3. Try to fetch holdings for the latest filing
        console.log(`Fetching holdings for Accession: ${latestFiling.accessionNumber}...`);
        const holdingsData = await holdingsParser.fetch13FHoldings(latestFiling.accessionNumber, cik);

        console.log('Holdings Result:', JSON.stringify(holdingsData, null, 2));

    } catch (error) {
        console.error('Debug Error:', error);
    }
}

debug();
