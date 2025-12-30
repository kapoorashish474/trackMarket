const express = require('express');
const cors = require('cors');
require('dotenv').config();
const sec13fService = require('./services/sec13fService');
const holdingsParser = require('./services/holdingsParser');
const dbService = require('./services/dbService');

const app = express();
const PORT = process.env.PORT || 5001;

// Initialize Database
dbService.initDb()
  .then(() => console.log('Database initialized successfully'))
  .catch(err => console.error('Failed to initialize database:', err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.get('/api/data', (req, res) => {
  res.json({
    message: 'Hello from Express backend!',
    timestamp: new Date().toISOString()
  });
});

// 13F API Routes
app.get('/api/13f/timeline', async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : null;
    const entity = req.query.entity;

    if (entity) {
      const data = await sec13fService.get13FTimeline(entity, year);
      res.json(data);
    } else {
      const data = await sec13fService.getAll13FData(year);
      res.json(data);
    }
  } catch (error) {
    console.error('Error in /api/13f/timeline:', error);
    res.status(500).json({
      error: 'Failed to fetch 13F timeline data',
      message: error.message
    });
  }
});

// Get holdings for a specific filing
app.get('/api/13f/holdings', async (req, res) => {
  try {
    const { accessionNumber, cik, previousAccessionNumber, previousCik } = req.query;

    if (!accessionNumber || !cik) {
      return res.status(400).json({
        error: 'Missing required parameters: accessionNumber and cik'
      });
    }

    const holdings = await holdingsParser.getFilingHoldings(accessionNumber, cik, previousAccessionNumber, previousCik);
    res.json(holdings);
  } catch (error) {
    console.error('Error in /api/13f/holdings:', error);
    res.status(500).json({
      error: 'Failed to fetch holdings data',
      message: error.message
    });
  }
});

// Generic entity endpoint (works for all entities)
app.get('/api/13f/:entity', async (req, res) => {
  try {
    const entity = req.params.entity;
    const year = req.query.year ? parseInt(req.query.year) : null;
    const data = await sec13fService.get13FTimeline(entity, year);
    res.json(data);
  } catch (error) {
    console.error(`Error in /api/13f/${req.params.entity}:`, error);
    res.status(500).json({
      error: `Failed to fetch 13F data for ${req.params.entity}`,
      message: error.message
    });
  }
});

// Market Data Routes
const marketService = require('./services/marketService');

app.get('/api/market/debt', async (req, res) => {
  try {
    const data = await marketService.fetchUSDebt();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch US Debt data', message: error.message });
  }
});

app.get('/api/market/gold', async (req, res) => {
  try {
    const data = await marketService.fetchMetalPrices('gold');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Gold prices', message: error.message });
  }
});

app.get('/api/market/silver', async (req, res) => {
  try {
    const data = await marketService.fetchMetalPrices('silver');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Silver prices', message: error.message });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

