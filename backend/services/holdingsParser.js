const axios = require('axios');
const xml2js = require('xml2js');
const dbService = require('./dbService');

const SEC_BASE_URL = 'https://www.sec.gov';

/**
 * Convert accession number to file path format
 * Example: 0001193125-25-282901 -> 0001193125-25-282901
 * Then split: 0001193125-25-282901 -> 0001193125/25-282901
 */
function formatAccessionNumber(accessionNumber) {
  // Remove dashes and dots
  const cleaned = accessionNumber.replace(/[-.]/g, '');
  // Format: first 10 digits, then rest
  if (cleaned.length >= 10) {
    const firstPart = cleaned.substring(0, 10);
    const secondPart = cleaned.substring(10);
    return `${firstPart}-${secondPart}`;
  }
  return accessionNumber;
}

/**
 * Get the XML file URL for a 13F filing
 * Accession number can be with or without dashes
 * URL format: /Archives/edgar/data/{CIK}/{accession_no_dashes}/{accession_with_dashes}-info-table.xml
 */
function get13FXMLUrl(accessionNumber, cik) {
  // Remove any existing dashes for the folder name
  const cleaned = accessionNumber.replace(/-/g, '');

  // Ensure it's at least 18 characters (pad with zeros if needed)
  const padded = cleaned.padStart(18, '0');

  // Format: first 10 digits, then rest with dash for filename
  const firstPart = padded.substring(0, 10);
  const secondPart = padded.substring(10);
  const formattedAcc = `${firstPart}-${secondPart}`;

  // URL structure: folder uses no dashes, filename uses dashes
  return `${SEC_BASE_URL}/Archives/edgar/data/${cik}/${padded}/${formattedAcc}-info-table.xml`;
}

/**
 * Fetch and parse 13F holdings from XML
 */
async function fetch13FHoldings(accessionNumber, cik) {
  try {
    // Check cache first
    const cachedData = await dbService.getCachedHoldings(accessionNumber);
    if (cachedData) {
      console.log(`Returning cached holdings for ${accessionNumber}`);
      return cachedData;
    }

    const headers = {
      'User-Agent': 'TrackMarket App contact@example.com',
      'Accept': 'application/xml, text/xml, */*',
      'Accept-Encoding': 'gzip, deflate',
      'Host': 'www.sec.gov'
    };

    // Construct the directory URL
    const cleaned = accessionNumber.replace(/-/g, '');
    const padded = cleaned.padStart(18, '0');
    const directoryUrl = `${SEC_BASE_URL}/Archives/edgar/data/${cik}/${padded}/index.xml`;

    console.log(`Fetching index from: ${directoryUrl}`);

    let xmlUrl = null;
    try {
      const indexResponse = await axios.get(directoryUrl, { headers, timeout: 10000 });
      const indexParser = new xml2js.Parser({ explicitArray: false });
      const indexResult = await indexParser.parseStringPromise(indexResponse.data);

      // Find the XML file in the directory listing
      if (indexResult && indexResult.directory && indexResult.directory.item) {
        const items = Array.isArray(indexResult.directory.item)
          ? indexResult.directory.item
          : [indexResult.directory.item];

        // Look for common names for the info table
        const infoTableItem = items.find(item => {
          // xml2js might return name as an object if it has attributes, or just a string
          // In the debug output we saw <name type="text.gif">...
          // So it might be item.name._ or item.name if explicitArray is false
          let name = '';
          if (typeof item.name === 'string') {
            name = item.name;
          } else if (item.name && item.name._) {
            name = item.name._;
          } else if (item.name && typeof item.name === 'object') {
            // Fallback: try to find a string property or just JSON stringify to check
            // But usually it's just the text content
            name = JSON.stringify(item.name);
          }

          name = name.toLowerCase();

          return (
            name.includes('infotable') ||
            name.includes('info-table') ||
            (name.endsWith('.xml') && !name.includes('primary_doc') && !name.includes('xsl'))
          );
        });

        if (infoTableItem) {
          // The href in index.xml is relative to SEC root, e.g., /Archives/...
          xmlUrl = `${SEC_BASE_URL}${infoTableItem.href}`;
          console.log(`Found holdings XML: ${xmlUrl}`);
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch/parse index.xml: ${err.message}. Falling back to guessing.`);
    }

    // Fallback patterns if index fetch fails or no file found
    if (!xmlUrl) {
      const firstPart = padded.substring(0, 10);
      const secondPart = padded.substring(10);
      const formattedAcc = `${firstPart}-${secondPart}`;

      // Try the most common pattern as fallback
      xmlUrl = `${SEC_BASE_URL}/Archives/edgar/data/${cik}/${padded}/${formattedAcc}-info-table.xml`;
    }

    let response;
    try {
      console.log(`Fetching holdings from: ${xmlUrl}`);
      response = await axios.get(xmlUrl, { headers, timeout: 15000 });
    } catch (err) {
      console.error(`Failed to fetch XML from ${xmlUrl}: ${err.message}`);

      // If the dynamic URL failed, try one more common fallback: infotable.xml directly
      try {
        const fallbackUrl = `${SEC_BASE_URL}/Archives/edgar/data/${cik}/${padded}/infotable.xml`;
        console.log(`Trying fallback URL: ${fallbackUrl}`);
        response = await axios.get(fallbackUrl, { headers, timeout: 15000 });
      } catch (fallbackErr) {
        console.error(`Fallback failed: ${fallbackErr.message}`);
      }
    }

    if (!response) {
      // If all attempts fail, return empty data with a note
      console.error(`Could not retrieve holdings for ${accessionNumber}`);
      console.log('Returning empty data (SEC source unavailable)');

      const resultData = {
        holdings: [],
        totalValue: 0,
        totalHoldings: 0,
        cashValue: 0,
        investmentValue: 0,
        cashPercentage: 0,
        investmentPercentage: 0,
        note: 'Data not available - SEC XML files could not be accessed.'
      };

      // Cache the empty result so we don't keep trying to fetch
      await dbService.cacheHoldings(accessionNumber, cik, resultData);

      return resultData;
    }

    // Parse XML
    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      ignoreAttrs: false
    });

    const result = await parser.parseStringPromise(response.data);

    // Extract holdings from the parsed XML structure
    // The structure varies, but typically: infoTable -> infoTable -> holding
    const holdings = extractHoldings(result);

    // Separate cash/equivalents from investments
    const cashHoldings = holdings.filter(h =>
      h.nameOfIssuer && (
        h.nameOfIssuer.toLowerCase().includes('cash') ||
        h.nameOfIssuer.toLowerCase().includes('treasury') ||
        h.titleOfClass && h.titleOfClass.toLowerCase().includes('cash')
      )
    );

    const investmentHoldings = holdings.filter(h => !cashHoldings.includes(h));

    // Calculate total value and percentages
    const totalValue = holdings.reduce((sum, h) => sum + (parseFloat(h.value) || 0), 0);
    const cashValue = cashHoldings.reduce((sum, h) => sum + (parseFloat(h.value) || 0), 0);
    const investmentValue = totalValue - cashValue;

    const holdingsWithPercentages = holdings.map(holding => ({
      ...holding,
      percentage: totalValue > 0 ? ((parseFloat(holding.value) || 0) / totalValue * 100) : 0,
      isCash: cashHoldings.includes(holding)
    }));

    const resultData = {
      holdings: holdingsWithPercentages.sort((a, b) => parseFloat(b.value) - parseFloat(a.value)),
      totalValue: totalValue,
      totalHoldings: holdings.length,
      cashValue: cashValue,
      investmentValue: investmentValue,
      cashPercentage: totalValue > 0 ? (cashValue / totalValue * 100) : 0,
      investmentPercentage: totalValue > 0 ? (investmentValue / totalValue * 100) : 0
    };

    // Cache the result
    await dbService.cacheHoldings(accessionNumber, cik, resultData);

    return resultData;
  } catch (error) {
    console.error(`Error fetching holdings for ${accessionNumber}:`, error.message);
    // Return empty holdings if we can't parse
    return {
      holdings: [],
      totalValue: 0,
      totalHoldings: 0,
      error: error.message
    };
  }
}

/**
 * Extract holdings from parsed XML (handles various XML structures)
 */
function extractHoldings(xmlData) {
  const holdings = [];

  // Try different possible XML structures
  const findInfoTable = (obj, path = []) => {
    if (!obj || typeof obj !== 'object') return null;

    if (obj.infoTable) {
      return Array.isArray(obj.infoTable) ? obj.infoTable : [obj.infoTable];
    }

    // Recursively search
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        const found = findInfoTable(obj[key], [...path, key]);
        if (found) return found;
      }
    }

    return null;
  };

  const infoTables = findInfoTable(xmlData);

  if (infoTables && Array.isArray(infoTables)) {
    infoTables.forEach(table => {
      if (table) {
        const holding = {
          nameOfIssuer: table.nameOfIssuer || table.name || 'Unknown',
          titleOfClass: table.titleOfClass || table.title || '',
          cusip: table.cusip || '',
          value: parseFloat(table.value || table.val || 0),
          shares: parseFloat(
            table.shrsOrPrnAmt?.sshPrnamt ||
            table.shrsOrPrnAmt?.sshPrnamt?._ ||
            table.shrsOrPrnAmt?.sshPrnAmt ||
            table.shrsOrPrnAmt?.sshPrnAmt?._ ||
            table.shares ||
            0
          ), putCall: table.putCall || '',
          investmentDiscretion: table.investmentDiscretion || ''
        };

        // DEBUG: Log the first holding's raw structure to see share field
        if (holdings.length === 0) {
          console.log('DEBUG: First raw holding item:', JSON.stringify(table, null, 2));
        }

        // Clean up the value - sometimes it's a string with commas
        if (typeof holding.value === 'string') {
          holding.value = parseFloat(holding.value.replace(/,/g, '')) || 0;
        }

        holdings.push(holding);
      }
    });
  }

  return holdings;
}

/**
 * Get sample holdings data for demonstration
 */
function getSampleHoldings(cik) {
  // Sample holdings based on typical Berkshire Hathaway or Scion holdings
  const isBerkshire = cik === '0001067983';

  if (isBerkshire) {
    return [
      { nameOfIssuer: 'APPLE INC', titleOfClass: 'COM', shares: 915560382, value: 157000000000, isCash: false, cusip: '037833100', ticker: 'AAPL' },
      { nameOfIssuer: 'BANK OF AMERICA CORP', titleOfClass: 'COM', shares: 1010000000, value: 35000000000, isCash: false, cusip: '060505104', ticker: 'BAC' },
      { nameOfIssuer: 'AMERICAN EXPRESS CO', titleOfClass: 'COM', shares: 151610700, value: 28000000000, isCash: false, cusip: '025816109', ticker: 'AXP' },
      { nameOfIssuer: 'COCA COLA CO', titleOfClass: 'COM', shares: 400000000, value: 24000000000, isCash: false, cusip: '191216100', ticker: 'KO' },
      { nameOfIssuer: 'CHEVRON CORP', titleOfClass: 'COM', shares: 126933331, value: 19000000000, isCash: false, cusip: '166764100', ticker: 'CVX' },
      { nameOfIssuer: 'OCCIDENTAL PETROLEUM CORP', titleOfClass: 'COM', shares: 248103066, value: 15000000000, isCash: false, cusip: '674599105', ticker: 'OXY' },
      { nameOfIssuer: 'KRAFT HEINZ CO', titleOfClass: 'COM', shares: 325634818, value: 11000000000, isCash: false, cusip: '500754106', ticker: 'KHC' },
      { nameOfIssuer: 'MOODY\'S CORP', titleOfClass: 'COM', shares: 24669778, value: 8000000000, isCash: false, cusip: '615369105', ticker: 'MCO' },
      { nameOfIssuer: 'US BANCORP', titleOfClass: 'COM', shares: 129000000, value: 5500000000, isCash: false, cusip: '902973304', ticker: 'USB' },
      { nameOfIssuer: 'DAVITA INC', titleOfClass: 'COM', shares: 36100000, value: 3200000000, isCash: false, cusip: '23918K108', ticker: 'DVA' },
      { nameOfIssuer: 'CASH & CASH EQUIVALENTS', titleOfClass: 'CASH', shares: 0, value: 150000000000, isCash: true, cusip: '', ticker: 'CASH' }
    ];
  } else {
    // Scion Asset Management sample holdings
    return [
      { nameOfIssuer: 'GAMESTOP CORP', titleOfClass: 'COM', shares: 5000000, value: 120000000, isCash: false, cusip: '36467W109', ticker: 'GME' },
      { nameOfIssuer: 'AMC ENTERTAINMENT HLDGS', titleOfClass: 'COM', shares: 2000000, value: 15000000, isCash: false, cusip: '00165C104', ticker: 'AMC' },
      { nameOfIssuer: 'BED BATH & BEYOND INC', titleOfClass: 'COM', shares: 1000000, value: 5000000, isCash: false, cusip: '075896100', ticker: 'BBBY' },
      { nameOfIssuer: 'CASH & CASH EQUIVALENTS', titleOfClass: 'CASH', shares: 0, value: 20000000, isCash: true, cusip: '', ticker: 'CASH' }
    ];
  }
}

/**
 * Compare current holdings with previous holdings to determine changes
 */
function compareHoldings(currentHoldings, previousHoldings) {
  if (!previousHoldings || !previousHoldings.length) {
    return currentHoldings.map(h => ({ ...h, change: null, changePercent: null, isNew: true }));
  }

  // Create a map of previous holdings for fast lookup
  // Use CUSIP as primary key, fallback to name/ticker
  const prevMap = new Map();
  previousHoldings.forEach(h => {
    const key = h.cusip || h.ticker || h.nameOfIssuer;
    if (key) prevMap.set(key, h);
  });

  return currentHoldings.map(curr => {
    const key = curr.cusip || curr.ticker || curr.nameOfIssuer;
    const prev = prevMap.get(key);

    if (prev) {
      const shareChange = curr.shares - prev.shares;
      const percentChange = prev.shares > 0 ? (shareChange / prev.shares) * 100 : 100;

      return {
        ...curr,
        change: shareChange,
        changePercent: percentChange,
        isNew: false
      };
    } else {
      return {
        ...curr,
        change: curr.shares,
        changePercent: 100,
        isNew: true
      };
    }
  });
}

/**
 * Get holdings for a specific filing, optionally comparing with a previous filing
 */
async function getFilingHoldings(accessionNumber, cik, previousAccessionNumber = null, previousCik = null) {
  const currentData = await fetch13FHoldings(accessionNumber, cik);

  // If no previous filing specified, return current data as is
  if (!previousAccessionNumber) {
    return currentData;
  }

  try {
    // Fetch previous holdings
    // Note: We use the same fetch function which handles caching
    const previousData = await fetch13FHoldings(previousAccessionNumber, previousCik || cik);

    if (previousData.holdings && currentData.holdings) {
      // Compare and merge comparison data into current holdings
      currentData.holdings = compareHoldings(currentData.holdings, previousData.holdings);
    }

    return currentData;
  } catch (error) {
    console.error('Error fetching previous holdings for comparison:', error);
    // Return current data without comparison if previous fetch fails
    return currentData;
  }
}

module.exports = {
  fetch13FHoldings,
  getFilingHoldings,
  get13FXMLUrl,
  getSampleHoldings,
  getTickerFromCusip
};

// Static mapping of common CUSIPs to Ticker symbols
// This is a partial list for demonstration purposes since a full CUSIP database is proprietary
const CUSIP_MAP = {
  '037833100': 'AAPL', // Apple Inc.
  '060505104': 'BAC',  // Bank of America Corp
  '025816109': 'AXP',  // American Express Co
  '191216100': 'KO',   // Coca-Cola Co
  '166764100': 'CVX',  // Chevron Corp
  '674599105': 'OXY',  // Occidental Petroleum Corp
  '500754106': 'KHC',  // Kraft Heinz Co
  '615369105': 'MCO',  // Moody's Corp
  '902973304': 'USB',  // US Bancorp
  '23918K108': 'DVA',  // DaVita Inc
  '36467W109': 'GME',  // GameStop Corp
  '00165C104': 'AMC',  // AMC Entertainment
  '075896100': 'BBBY', // Bed Bath & Beyond (Delisted)
  '594918104': 'MSFT', // Microsoft Corp
  '023135106': 'AMZN', // Amazon.com Inc
  '30303M102': 'META', // Meta Platforms Inc
  '02079K305': 'GOOGL',// Alphabet Inc Class A
  '02079K109': 'GOOG', // Alphabet Inc Class C
  '88160R101': 'TSLA', // Tesla Inc
  '67066G104': 'NVDA', // NVIDIA Corp
  '46625H100': 'JPM',  // JPMorgan Chase & Co
  '92826C839': 'V',    // Visa Inc
  '478160104': 'JNJ',  // Johnson & Johnson
  '931142103': 'WMT',  // Walmart Inc
  '718172109': 'PG',   // Procter & Gamble Co
  '57636Q104': 'MA',   // Mastercard Inc
  '437076102': 'HD',   // Home Depot Inc
  '22160K105': 'COST', // Costco Wholesale Corp
  '17275R102': 'CSCO', // Cisco Systems Inc
  '00206R102': 'T',    // AT&T Inc
  '92343V104': 'VZ',   // Verizon Communications
  '254687106': 'DIS',  // Walt Disney Co
  '654106103': 'NKE',  // Nike Inc
  '79466L302': 'CRM',  // Salesforce Inc
  '00724F101': 'ADBE', // Adobe Inc
  '458140100': 'INTC', // Intel Corp
  '002824100': 'ABT',  // Abbott Laboratories
  '713448108': 'PEP',  // PepsiCo Inc
  '194162103': 'CL',   // Colgate-Palmolive
  '30231G102': 'XOM',  // Exxon Mobil Corp
  '20825C104': 'COP',  // ConocoPhillips
  '78378X107': 'SBUX', // Starbucks Corp
  '595112103': 'MU',   // Micron Technology
  '007903107': 'AMD',  // Advanced Micro Devices
  '882508104': 'TXN',  // Texas Instruments
  '742718109': 'PG',   // Procter & Gamble
  '88579Y101': 'MMM',  // 3M Co
  '459200101': 'IBM',  // IBM
  '369604103': 'GE',   // General Electric
  '37045V100': 'GM',   // General Motors
  '345370860': 'F',    // Ford Motor Co
  '097023105': 'BA',   // Boeing Co
  '126408103': 'C',    // Citigroup Inc
  '949746101': 'WFC',  // Wells Fargo & Co
  '38141G104': 'GS',   // Goldman Sachs Group
  '617446448': 'MS',   // Morgan Stanley
  '09247X101': 'BLK',  // BlackRock Inc
};

/**
 * Get ticker symbol from CUSIP
 */
function getTickerFromCusip(cusip) {
  if (!cusip) return null;
  // Clean CUSIP (remove spaces, etc)
  const cleanCusip = cusip.trim().toUpperCase();
  return CUSIP_MAP[cleanCusip] || null;
}

