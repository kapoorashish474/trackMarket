# Data Availability Guide

## Why Some Quarters May Not Have Data

There are several reasons why 13F filing data might not be available for certain quarters:

### 1. **SEC API Limitations**
The SEC EDGAR `/submissions/CIK{cik}.json` API endpoint only returns **recent filings** (typically the last 2-3 years). This is a limitation of the SEC's public API.

**Impact:**
- Older quarters (beyond 2-3 years) may not appear in the timeline
- Historical data requires alternative methods

### 2. **Missing Filings**
Some entities may not file 13F forms for every quarter if:
- They don't meet the $100 million threshold for that quarter
- They're exempt from filing requirements
- The filing was delayed or missed

### 3. **XML Holdings Data Unavailable**
Even if a filing exists, the holdings XML data may not be available if:
- The filing is from before the SEC standardized XML format (pre-2013)
- The SEC hasn't processed/archived the XML file yet
- The file path or naming convention differs for older filings
- The filing structure changed over time

### 4. **Rate Limiting**
The SEC has rate limits on their API. If too many requests are made, access may be temporarily restricted.

## How to Get Missing Data

### Option 1: Use SEC EDGAR Direct Search
1. Go to https://www.sec.gov/edgar/searchedgar/companysearch.html
2. Search by CIK number (e.g., 0001067983 for Berkshire Hathaway)
3. Filter by form type: "13F-HR" or "13F-HR/A"
4. Select the specific filing date/quarter
5. Download the filing document directly

### Option 2: Use SEC Company Filings API
The SEC provides a company-specific filings endpoint, but it has similar limitations:
- URL: `https://data.sec.gov/company/cik{cik}.json`
- May require additional authentication
- Still limited to recent filings

### Option 3: Third-Party Data Providers
Consider using services that aggregate SEC data:
- **SeekEdgar** (https://www.seekedgar.co/)
- **SECDatabase** (https://www.secdatabase.com/)
- **Quandl/Nasdaq Data Link** (for processed 13F data)

### Option 4: Manual Download and Parse
For specific missing quarters:
1. Download the filing from SEC EDGAR
2. Extract holdings data manually
3. Add to the database cache if needed

## Current Implementation Details

### What the App Does
- Fetches filings from SEC submissions API
- Filters for 13F-HR and 13F-HR/A forms
- Organizes by year and quarter
- Attempts to fetch XML holdings data for each filing

### Limitations
- Only shows filings from the last 2-3 years (SEC API limitation)
- Holdings data may not be available for older filings
- Some quarters may legitimately have no filings

### Error Messages
When holdings data is unavailable, you'll see:
- "No holdings data available" - The filing exists but XML data isn't accessible
- "Data not available - SEC XML files could not be accessed" - The XML file couldn't be found or parsed

## Recommendations

1. **For Recent Data (Last 2-3 Years)**: The app should work well
2. **For Historical Data**: Use SEC EDGAR direct search or third-party providers
3. **For Missing Quarters**: Check if the entity actually filed for that quarter (they may be exempt)
4. **For Holdings Data**: Older filings may only be available in HTML/PDF format, not XML

## Future Enhancements

Potential improvements to get more data:
1. Implement HTML/PDF parsing for older filings
2. Add support for SEC company filings API with date ranges
3. Integrate with third-party data providers
4. Add manual data import functionality
5. Implement better caching for historical data

## Contact & Support

If you need specific historical data:
- Check SEC EDGAR directly: https://www.sec.gov/edgar/searchedgar/companysearch.html
- Contact the entity's investor relations for filing information
- Use SEC's public document request system if needed

