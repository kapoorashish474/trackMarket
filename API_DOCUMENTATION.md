# 13F API Documentation

## Overview
This application provides access to 13F filing data from the SEC EDGAR database for institutional investors.

## Entities Tracked
- **Berkshire Hathaway Inc.** (Warren Buffett) - CIK: 0001067983
- **Dalal Street LLC** (Mohnish Pabrai) - CIK: 0001549575
- **Pershing Square** (Bill Ackman) - CIK: 0001336528
- **Duquesne Family Office LLC** (Stanley Druckenmiller) - CIK: 0001536411
- **Cantor Fitzgerald, L.P.** (Howard Lutnick) - CIK: 0001024896
Filings are limited to **13F-HR** and **13F-HR/A** only. For each report period (year/quarter), only the latest filing is shown (amendments supersede originals).

## API Endpoints

### Get All 13F Timeline Data
```
GET /api/13f/timeline?years=5
```
Returns timeline data for Berkshire Hathaway.

**Query Parameters:**
- `years` (optional): Number of years to look back (default: 5)

**Response:**
```json
{
  "berkshire": {
    "entity": "berkshire",
    "cik": "0001067983",
    "companyName": "Berkshire Hathaway Inc. (Warren Buffett)",
    "totalFilings": 40,
    "years": 5,
    "filings": [...],
    "timeline": {
      "2024": {
        "year": 2024,
        "quarters": {
          "Q1": [...],
          "Q2": [...]
        },
        "totalFilings": 4
      }
    }
  },
  "generatedAt": "2024-12-26T..."
}
```

### Get Entity 13F Data
```
GET /api/13f/berkshire?year=2025
GET /api/13f/dalalstreet?year=2025
GET /api/13f/pershing?year=2025
GET /api/13f/duquesne?year=2025
GET /api/13f/cantorfitzgerald?year=2025
```
Returns timeline data for the given entity and optional year.

### Get Last-Year Rate of Return
```
GET /api/13f/berkshire/return
GET /api/13f/dalalstreet/return
GET /api/13f/pershing/return
GET /api/13f/duquesne/return
GET /api/13f/cantorfitzgerald/return
```
Returns the year-over-year change in 13F reported portfolio value (prior period vs. latest filing). Response includes `returnPercent`, `latestValue`, `priorValue`, `latestReportDate`, `priorReportDate`. Not the same as fund performance; based only on reported holdings values.

## Data Source
Data is fetched from the SEC EDGAR database (https://data.sec.gov) using their public API. The SEC requires a User-Agent header for all requests.

## Frontend Access
- **UI Port:** http://localhost:3000
- **API Port:** http://localhost:5000

Navigate to the "13F Timeline" tab in the application to view the interactive timeline.

## Example Usage

### Using curl
```bash
# Get all entities (last 5 years)
curl http://localhost:5000/api/13f/timeline?years=5

# Get Berkshire only (last 5 years)
curl http://localhost:5000/api/13f/berkshire?years=5
```

### Using JavaScript
```javascript
// Fetch all entities
const response = await fetch('/api/13f/timeline?years=5');
const data = await response.json();

// Fetch Berkshire only
const berkshireResponse = await fetch('/api/13f/berkshire?years=5');
const berkshireData = await berkshireResponse.json();
```

## Notes
- The SEC API may have rate limiting. Be respectful with request frequency.
- Data is fetched in real-time from the SEC EDGAR database.
- Filings are organized by year and quarter for easy timeline visualization.
- The application filters for 13F-HR (initial) and 13F-HR/A (amended) forms only.



