const holdingsParser = require('./services/holdingsParser');
const sec13fService = require('./services/sec13fService');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function debugComparison() {
    const cik = '0001067983'; // Berkshire Hathaway
    console.log(`Debugging comparison for CIK: ${cik}`);

    try {
        // 1. Fetch recent filings to get accession numbers
        console.log('Fetching filings list...');
        const filings = await sec13fService.fetch13FFilings(cik);

        if (!filings || filings.length < 2) {
            console.log('Not enough filings to compare.');
            return;
        }

        const currentFiling = filings[0];
        const previousFiling = filings[1];

        console.log(`Current Filing: ${currentFiling.filingDate} (${currentFiling.accessionNumber})`);
        console.log(`Previous Filing: ${previousFiling.filingDate} (${previousFiling.accessionNumber})`);

        // CLEAR CACHE for these two to ensure we get real data
        const dbPath = path.join(__dirname, 'data/trackmarket.db');
        const db = new sqlite3.Database(dbPath);

        console.log('Clearing cache for test filings...');
        await new Promise((resolve) => {
            db.run('DELETE FROM holdings_cache WHERE accession_number IN (?, ?)',
                [currentFiling.accessionNumber, previousFiling.accessionNumber],
                (err) => {
                    if (err) console.error('Error clearing cache:', err);
                    else console.log('Cache cleared.');
                    resolve();
                });
        });

        // 2. Fetch holdings for both
        console.log('Fetching current holdings...');
        const currentData = await holdingsParser.fetch13FHoldings(currentFiling.accessionNumber, cik);

        console.log('Fetching previous holdings...');
        const previousData = await holdingsParser.fetch13FHoldings(previousFiling.accessionNumber, cik);

        console.log(`Current Holdings Count: ${currentData.holdings.length}`);
        console.log(`Previous Holdings Count: ${previousData.holdings.length}`);

        // 3. Run comparison logic manually
        // We need to access the internal compareHoldings function, but it's not exported directly.
        // However, getFilingHoldings uses it.
        // Let's copy the logic here to test it or modify holdingsParser to export it.
        // For now, let's just inspect a few items to see if keys match.

        if (currentData.holdings.length > 0 && previousData.holdings.length > 0) {
            const sampleCurrent = currentData.holdings[0];
            console.log('\nSample Current Holding:', JSON.stringify(sampleCurrent, null, 2));

            // Try to find this in previous
            const match = previousData.holdings.find(h =>
                (h.cusip && h.cusip === sampleCurrent.cusip) ||
                (h.ticker && h.ticker === sampleCurrent.ticker) ||
                (h.nameOfIssuer === sampleCurrent.nameOfIssuer)
            );

            if (match) {
                console.log('Found match in previous:', JSON.stringify(match, null, 2));
                const shareChange = sampleCurrent.shares - match.shares;
                console.log(`Calculated Change: ${shareChange}`);
            } else {
                console.log('No match found in previous for this item.');
                // List some previous items to see why
                console.log('First 3 previous items:', JSON.stringify(previousData.holdings.slice(0, 3), null, 2));
            }
        }

        // 4. Test the actual getFilingHoldings function with comparison
        console.log('\nTesting getFilingHoldings with comparison...');
        const result = await holdingsParser.getFilingHoldings(
            currentFiling.accessionNumber,
            cik,
            previousFiling.accessionNumber,
            cik
        );

        const changedItems = result.holdings.filter(h => h.change !== 0 && h.change !== null);
        console.log(`Total items with detected change: ${changedItems.length}`);
        if (changedItems.length > 0) {
            console.log('Sample changed item:', JSON.stringify(changedItems[0], null, 2));
        } else {
            console.log('No changes detected by function.');
        }

    } catch (error) {
        console.error('Debug Error:', error);
    }
}

debugComparison();
