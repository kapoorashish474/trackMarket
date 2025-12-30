const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'trackmarket.db');
const db = new sqlite3.Database(dbPath);

/**
 * Initialize database schema
 */
function initDb() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Holdings Cache Table
            db.run(`
                CREATE TABLE IF NOT EXISTS holdings_cache (
                    accession_number TEXT PRIMARY KEY,
                    cik TEXT,
                    data TEXT,
                    created_at INTEGER
                )
            `, (err) => {
                if (err) console.error('Error creating holdings_cache table:', err);
            });

            // Market Data Cache Table
            db.run(`
                CREATE TABLE IF NOT EXISTS market_data (
                    type TEXT PRIMARY KEY,
                    data TEXT,
                    updated_at INTEGER
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating market_data table:', err);
                    reject(err);
                } else {
                    console.log('Database initialized with market_data table');
                    resolve();
                }
            });
        });
    });
}

/**
 * Get cached holdings
 */
function getCachedHoldings(accessionNumber) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT data FROM holdings_cache WHERE accession_number = ?',
            [accessionNumber],
            (err, row) => {
                if (err) {
                    console.error('Error fetching from cache:', err);
                    reject(err);
                } else {
                    resolve(row ? JSON.parse(row.data) : null);
                }
            }
        );
    });
}

/**
 * Cache holdings data
 */
function cacheHoldings(accessionNumber, cik, data) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare('INSERT OR REPLACE INTO holdings_cache (accession_number, cik, data, created_at) VALUES (?, ?, ?, ?)');
        stmt.run(accessionNumber, cik, JSON.stringify(data), Date.now(), (err) => {
            if (err) {
                console.error('Error saving to cache:', err);
                reject(err);
            } else {
                console.log(`Cached holdings for ${accessionNumber}`);
                resolve();
            }
        });
        stmt.finalize();
    });
}

/**
 * Get cached market data
 */
function getCachedMarketData(type) {
    return new Promise((resolve, reject) => {
        // Cache valid for 24 hours
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

        db.get(
            'SELECT data FROM market_data WHERE type = ? AND updated_at > ?',
            [type, oneDayAgo],
            (err, row) => {
                if (err) {
                    console.error(`Error fetching ${type} from cache:`, err);
                    reject(err);
                } else {
                    resolve(row ? JSON.parse(row.data) : null);
                }
            }
        );
    });
}

/**
 * Cache market data
 */
function cacheMarketData(type, data) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare('INSERT OR REPLACE INTO market_data (type, data, updated_at) VALUES (?, ?, ?)');
        stmt.run(type, JSON.stringify(data), Date.now(), (err) => {
            if (err) {
                console.error(`Error saving ${type} to cache:`, err);
                reject(err);
            } else {
                console.log(`Cached market data for ${type}`);
                resolve();
            }
        });
        stmt.finalize();
    });
}

module.exports = {
    initDb,
    getCachedHoldings,
    cacheHoldings,
    getCachedMarketData,
    cacheMarketData
};
