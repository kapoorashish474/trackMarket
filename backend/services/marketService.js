const axios = require('axios');
const dbService = require('./dbService');

// US Treasury API Base URL
const TREASURY_BASE_URL = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service';

// Free Metal Price API (using a public free tier or fallback)
// Note: For production, you should use a real API key. 
// We will use a mock/fallback for now if no key is provided, or a public endpoint if available.
const METAL_API_URL = 'https://api.metalpriceapi.com/v1/latest';

/**
 * Fetch US National Debt Data (Yearly)
 * Endpoint: /v2/accounting/od/debt_outstanding
 */
async function fetchUSDebt() {
    try {
        // Check cache first (using new key for yearly data)
        const cachedData = await dbService.getCachedMarketData('us_debt_yearly');
        if (cachedData) {
            console.log('Returning cached US Debt data (Yearly)');
            return cachedData;
        }

        console.log('Fetching US Debt data from Treasury API...');

        // Fetch historical debt outstanding (annual data)
        // Sort by record_date descending to get most recent first
        const response = await axios.get(`${TREASURY_BASE_URL}/v2/accounting/od/debt_outstanding`, {
            params: {
                'sort': '-record_date',
                'page[size]': 20 // Last 20 years
            }
        });

        if (response.data && response.data.data) {
            const debtData = response.data.data.map(record => ({
                date: record.record_date,
                amount: parseFloat(record.debt_outstanding_amt)
            }));

            const result = {
                current: debtData[0],
                history: debtData
            };

            // Cache the result
            await dbService.cacheMarketData('us_debt_yearly', result);
            return result;
        }

        throw new Error('Invalid response from Treasury API');
    } catch (error) {
        console.error('Error fetching US Debt:', error.message);
        throw error;
    }
}

/**
 * Fetch Gold and Silver Prices
 * Since we don't have a paid API key, we'll simulate this with a realistic mock 
 * or use a very limited free tier if available. 
 * For this demo, we will generate realistic data if the API fails or requires a key.
 */
async function fetchMetalPrices(metal) {
    const type = `metal_${metal}_yearly`; // metal_gold_yearly or metal_silver_yearly

    try {
        // Check cache first
        const cachedData = await dbService.getCachedMarketData(type);
        if (cachedData) {
            console.log(`Returning cached ${metal} data (Yearly)`);
            return cachedData;
        }

        console.log(`Fetching ${metal} prices...`);

        // In a real app, we would call an API here.
        // const response = await axios.get(...)

        // For demonstration purposes (and to avoid API key issues), 
        // we will generate realistic market data.
        const result = generateMockMetalData(metal);

        // Cache the result
        await dbService.cacheMarketData(type, result);
        return result;

    } catch (error) {
        console.error(`Error fetching ${metal} prices:`, error.message);
        throw error;
    }
}

/**
 * Generate realistic mock data for metals (Yearly)
 */
function generateMockMetalData(metal) {
    const basePrice = metal === 'gold' ? 2000 : 25;
    const volatility = metal === 'gold' ? 200 : 5; // Higher volatility for yearly
    const trend = metal === 'gold' ? 50 : 1; // Upward trend per year
    const history = [];
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < 20; i++) {
        const year = currentYear - i;
        const date = `${year}-12-31`; // End of year

        // Simulate price history: Base + Trend - Volatility
        // We go backwards, so we subtract the trend
        const randomChange = (Math.random() - 0.5) * volatility;
        const trendEffect = i * trend;
        let price = basePrice - trendEffect + randomChange;

        // Ensure price doesn't go below zero
        if (price < 0) price = basePrice * 0.1;

        history.push({
            date: date,
            price: parseFloat(price.toFixed(2))
        });
    }

    return {
        current: history[0],
        history: history
    };
}

module.exports = {
    fetchUSDebt,
    fetchMetalPrices
};
