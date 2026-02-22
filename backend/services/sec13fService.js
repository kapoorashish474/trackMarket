const axios = require('axios');
const holdingsParser = require('./holdingsParser');

// CIK numbers for the entities
const CIK_MAP = {
  'berkshire': { cik: '0001067983', name: 'Berkshire Hathaway Inc. (Warren Buffett)' },
  'dalalstreet': { cik: '0001549575', name: 'Dalal Street LLC (Mohnish Pabrai)' },
  'pershing': { cik: '0001336528', name: 'Pershing Square (Bill Ackman)' },
  'duquesne': { cik: '0001536411', name: 'Duquesne Family Office LLC (Stanley Druckenmiller)' },
  'cantorfitzgerald': { cik: '0001024896', name: 'Cantor Fitzgerald, L.P. (Howard Lutnick)' }
};

// SEC EDGAR API base URL
const SEC_BASE_URL = 'https://data.sec.gov';

/**
 * Fetch 13F filings for a given CIK using company filings API (for historical data)
 * @param {string} cik - Central Index Key (CIK) number
 * @param {Date} startDate - Start date for search
 * @param {Date} endDate - End date for search
 * @returns {Promise<Array>} Array of 13F filing data
 */
async function fetchHistoricalFilings(cik, startDate, endDate) {
  try {
    const headers = {
      'User-Agent': 'TrackMarket App contact@example.com',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Host': 'data.sec.gov'
    };

    // Format dates for SEC API (YYYY-MM-DD)
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Use company filings API with date range
    // Note: This endpoint may have rate limits and may not return all historical data
    const filingsUrl = `${SEC_BASE_URL}/company/cik${cik}.json`;
    
    try {
      const response = await axios.get(filingsUrl, { headers, timeout: 10000 });
      // This endpoint structure may differ, so we'll fall back to submissions if needed
      if (response.data && response.data.filings) {
        // Process if structure matches
        return [];
      }
    } catch (err) {
      console.log(`Company filings API not available, using submissions API: ${err.message}`);
    }

    return [];
  } catch (error) {
    console.error(`Error fetching historical filings: ${error.message}`);
    return [];
  }
}

/**
 * Fetch 13F filings for a given CIK
 * @param {string} cik - Central Index Key (CIK) number
 * @param {number} year - Specific year to filter by (e.g., 2025)
 * @returns {Promise<Array>} Array of 13F filing data
 */
async function fetch13FFilings(cik, year = null) {
  try {
    // If year is provided, filter by that specific year
    let startDate, endDate;
    if (year) {
      startDate = new Date(year, 0, 1); // January 1 of the year
      endDate = new Date(year, 11, 31, 23, 59, 59); // December 31 of the year
    } else {
      // Default: current year
      const currentYear = new Date().getFullYear();
      startDate = new Date(currentYear, 0, 1);
      endDate = new Date(currentYear, 11, 31, 23, 59, 59);
    }

    // SEC EDGAR submissions endpoint (only returns recent filings, typically last 2-3 years)
    const submissionsUrl = `${SEC_BASE_URL}/submissions/CIK${cik}.json`;

    // Set headers required by SEC (they require a User-Agent)
    const headers = {
      'User-Agent': 'TrackMarket App contact@example.com',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Host': 'data.sec.gov'
    };

    const response = await axios.get(submissionsUrl, { headers });
    const submissions = response.data;

    if (!submissions || !submissions.filings || !submissions.filings.recent) {
      console.warn(`No recent filings found for CIK ${cik}. The SEC submissions API only returns recent filings (typically last 2-3 years).`);
      return [];
    }

    const filings = submissions.filings.recent;
    const form13F = [];
    const formTypes = filings.form;
    const filingDates = filings.filingDate;
    const reportDates = filings.reportDate;
    const accessionNumbers = filings.accessionNumber;

    // Filter for 13F-HR and 13F-HR/A forms only (exclude other 13F types for accuracy)
    for (let i = 0; i < formTypes.length; i++) {
      if (formTypes[i] === '13F-HR' || formTypes[i] === '13F-HR/A') {
        const filingDate = new Date(filingDates[i]);
        const reportDateStr = reportDates[i] || filingDates[i];

        // Check if within date range
        if (filingDate >= startDate && filingDate <= endDate) {
          const accessionNo = accessionNumbers[i];
          form13F.push({
            formType: formTypes[i],
            filingDate: filingDates[i],
            reportDate: reportDateStr,
            accessionNumber: accessionNo,
            cik: cik,
            companyName: submissions.name || 'Unknown',
            hasHoldings: true
          });
        }
      }
    }

    // Deduplicate by report period: for each (year, quarter) keep only the latest filing (amendments supersede originals)
    const byReportPeriod = {};
    form13F.forEach(f => {
      const reportDate = new Date(f.reportDate);
      const reportYear = reportDate.getFullYear();
      const reportQ = getQuarter(f.reportDate);
      const key = `${reportYear}-${reportQ}`;
      if (!byReportPeriod[key] || new Date(f.filingDate) > new Date(byReportPeriod[key].filingDate)) {
        byReportPeriod[key] = f;
      }
    });

    // Replace with deduped list, sorted by filing date (most recent first)
    form13F.length = 0;
    form13F.push(...Object.values(byReportPeriod).sort((a, b) => new Date(b.filingDate) - new Date(a.filingDate)));

    // Log warning if year requested is old and no filings found
    if (year && form13F.length === 0 && year < new Date().getFullYear() - 2) {
      console.warn(`No filings found for year ${year}. The SEC submissions API only returns recent filings. For historical data, you may need to use the SEC EDGAR search directly.`);
    }

    return form13F;
  } catch (error) {
    console.error(`Error fetching 13F filings for CIK ${cik}:`, error.message);
    throw new Error(`Failed to fetch 13F data: ${error.message}`);
  }
}

/**
 * Get 13F timeline data for a specific entity
 * @param {string} entityKey - entity key from CIK_MAP
 * @param {number} year - Specific year to filter by
 * @returns {Promise<Object>} Timeline data
 */
async function get13FTimeline(entityKey, year = null) {
  const entity = CIK_MAP[entityKey.toLowerCase()];

  if (!entity) {
    throw new Error(`Unknown entity: ${entityKey}`);
  }

  const cik = entity.cik;
  const filings = await fetch13FFilings(cik, year);

  return {
    entity: entityKey,
    cik: cik,
    companyName: entity.name,
    totalFilings: filings.length,
    year: year || new Date().getFullYear(),
    filings: filings,
    timeline: organizeByYear(filings)
  };
}

/**
 * Organize filings by year for timeline display
 * @param {Array} filings - Array of filing objects
 * @returns {Object} Filings organized by year
 */
function organizeByYear(filings) {
  const timeline = {};

  filings.forEach(filing => {
    const year = new Date(filing.filingDate).getFullYear();
    const quarter = getQuarter(filing.filingDate);

    if (!timeline[year]) {
      timeline[year] = {
        year: year,
        quarters: {},
        totalFilings: 0
      };
    }

    if (!timeline[year].quarters[quarter]) {
      timeline[year].quarters[quarter] = [];
    }

    timeline[year].quarters[quarter].push(filing);
    timeline[year].totalFilings++;
  });

  return timeline;
}

/**
 * Get quarter from date
 * @param {string} dateString - Date string
 * @returns {string} Quarter (Q1, Q2, Q3, Q4)
 */
function getQuarter(dateString) {
  const date = new Date(dateString);
  const month = date.getMonth() + 1; // 1-12

  if (month <= 3) return 'Q1';
  if (month <= 6) return 'Q2';
  if (month <= 9) return 'Q3';
  return 'Q4';
}

/**
 * Get 13F data for both entities
 * @param {number} year - Specific year to filter by
 * @returns {Promise<Object>} Combined timeline data
 */
async function getAll13FData(year = null) {
  try {
    const berkshireData = await get13FTimeline('berkshire', year);
    return {
      berkshire: berkshireData,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching all 13F data:', error);
    throw error;
  }
}

/**
 * Get last-year rate of return for an entity based on 13F reported portfolio values.
 * Compares same quarter year-over-year (e.g. Q4 2024 vs Q4 2023) so the return is comparable.
 * This is the change in reported portfolio value, not actual fund performance.
 * @param {string} entityKey - entity key from CIK_MAP (e.g. 'berkshire', 'dalalstreet', 'pershing')
 * @returns {Promise<Object>} { latestValue, priorValue, returnPercent, latestReportDate, priorReportDate, error? }
 */
async function get13FYearOverYearReturn(entityKey) {
  const entity = CIK_MAP[entityKey.toLowerCase()];
  if (!entity) {
    return { error: `Unknown entity: ${entityKey}` };
  }

  const cik = entity.cik;
  const currentYear = new Date().getFullYear();

  try {
    const [filingsCurrent, filingsPriorYear] = await Promise.all([
      fetch13FFilings(cik, currentYear),
      fetch13FFilings(cik, currentYear - 1)
    ]);

    const allFilings = [...filingsCurrent, ...filingsPriorYear].sort(
      (a, b) => new Date(b.reportDate) - new Date(a.reportDate)
    );

    if (allFilings.length === 0) {
      return { error: 'No 13F filings found' };
    }

    const latestFiling = allFilings[0];
    const latestReportDate = new Date(latestFiling.reportDate);
    const latestYear = latestReportDate.getFullYear();
    const latestQ = getQuarter(latestFiling.reportDate);
    const priorYear = latestYear - 1;

    // Prior = same quarter, one year earlier (e.g. Q4 2024 → Q4 2023)
    const priorFiling = allFilings.find((f) => {
      const d = new Date(f.reportDate);
      return d.getFullYear() === priorYear && getQuarter(f.reportDate) === latestQ;
    });

    if (!priorFiling) {
      return {
        error: 'Not enough history for 1-year return (same quarter prior year not found)',
        latestReportDate: latestFiling.reportDate,
        latestValue: null
      };
    }

    const [latestHoldings, priorHoldings] = await Promise.all([
      holdingsParser.fetch13FHoldings(latestFiling.accessionNumber, cik),
      holdingsParser.fetch13FHoldings(priorFiling.accessionNumber, cik)
    ]);

    const latestValue = latestHoldings.totalValue || 0;
    const priorValue = priorHoldings.totalValue || 0;

    if (priorValue <= 0) {
      return {
        error: 'Prior period portfolio value not available',
        latestReportDate: latestFiling.reportDate,
        priorReportDate: priorFiling.reportDate,
        latestValue,
        priorValue: 0
      };
    }

    const returnPercent = ((latestValue - priorValue) / priorValue) * 100;

    return {
      latestValue,
      priorValue,
      returnPercent,
      latestReportDate: latestFiling.reportDate,
      priorReportDate: priorFiling.reportDate,
      companyName: entity.name
    };
  } catch (err) {
    console.error(`Error computing YoY return for ${entityKey}:`, err);
    return {
      error: err.message || 'Failed to compute year-over-year return'
    };
  }
}

module.exports = {
  get13FTimeline,
  getAll13FData,
  fetch13FFilings,
  get13FYearOverYearReturn,
  CIK_MAP,
  getEntityName: (entityKey) => {
    const entity = CIK_MAP[entityKey.toLowerCase()];
    return entity ? entity.name : entityKey;
  }
};

