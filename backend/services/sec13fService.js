const axios = require('axios');
const holdingsParser = require('./holdingsParser');

// CIK numbers for the entities
const CIK_MAP = {
  'berkshire': { cik: '0001067983', name: 'Berkshire Hathaway Inc. (Warren Buffett)' },
  'scion': { cik: '0001649339', name: 'Scion Asset Management (Michael Burry)' },
  'bridgewater': { cik: '0001350694', name: 'Bridgewater Associates (Ray Dalio)' },
  'pershing': { cik: '0001336528', name: 'Pershing Square Capital (Bill Ackman)' },

  'baupost': { cik: '0001061768', name: 'Baupost Group (Seth Klarman)' },
  'valueact': { cik: '0001079114', name: 'ValueAct Capital' },
  'appaloosa': { cik: '0001656456', name: 'Appaloosa Management (David Tepper)' },
  'duquesne': { cik: '0001536411', name: 'Duquesne Family Office (Stanley Druckenmiller)' }
};

// SEC EDGAR API base URL
const SEC_BASE_URL = 'https://data.sec.gov';

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

    // SEC EDGAR submissions endpoint
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
      return [];
    }

    const filings = submissions.filings.recent;
    const form13F = [];
    const formTypes = filings.form;
    const filingDates = filings.filingDate;
    const reportDates = filings.reportDate;

    // Filter for 13F-HR and 13F-HR/A forms
    for (let i = 0; i < formTypes.length; i++) {
      if (formTypes[i] === '13F-HR' || formTypes[i] === '13F-HR/A') {
        const filingDate = new Date(filingDates[i]);
        const reportDate = reportDates[i] ? new Date(reportDates[i]) : filingDate;

        // Check if within date range
        if (filingDate >= startDate && filingDate <= endDate) {
          // Keep accession number as-is (may have dashes or not)
          const accessionNo = filings.accessionNumber[i];
          form13F.push({
            formType: formTypes[i],
            filingDate: filingDates[i],
            reportDate: reportDates[i] || filingDates[i],
            accessionNumber: accessionNo,
            cik: cik,
            companyName: submissions.name || 'Unknown',
            hasHoldings: true // Flag to indicate we can fetch holdings
          });
        }
      }
    }

    // Sort by filing date (most recent first)
    form13F.sort((a, b) => new Date(b.filingDate) - new Date(a.filingDate));

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
    const [berkshireData, scionData] = await Promise.all([
      get13FTimeline('berkshire', year),
      get13FTimeline('scion', year)
    ]);

    return {
      berkshire: berkshireData,
      scion: scionData,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching all 13F data:', error);
    throw error;
  }
}

module.exports = {
  get13FTimeline,
  getAll13FData,
  fetch13FFilings,
  CIK_MAP,
  getEntityName: (entityKey) => {
    const entity = CIK_MAP[entityKey.toLowerCase()];
    return entity ? entity.name : entityKey;
  }
};

