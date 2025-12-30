# 13F API Documentation

## Overview
This application provides access to 13F filing data from the SEC EDGAR database for institutional investors.

## Entities Tracked
- **Berkshire Hathaway Inc.** (Warren Buffett) - CIK: 0001067983
- **Scion Asset Management** - CIK: 0001577557

## API Endpoints

### Get All 13F Timeline Data
```
GET /api/13f/timeline?years=10
```
Returns timeline data for both Berkshire Hathaway and Scion Asset Management.

**Query Parameters:**
- `years` (optional): Number of years to look back (default: 10, options: 5, 10, 15)

**Response:**
```json
{
  "berkshire": {
    "entity": "berkshire",
    "cik": "0001067983",
    "companyName": "Berkshire Hathaway Inc.",
    "totalFilings": 40,
    "years": 10,
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
  "scion": {
    ...
  },
  "generatedAt": "2024-12-26T..."
}
```

### Get Berkshire Hathaway 13F Data
```
GET /api/13f/berkshire?years=10
```
Returns timeline data for Berkshire Hathaway only.

### Get Scion Asset Management 13F Data
```
GET /api/13f/scion?years=10
```
Returns timeline data for Scion Asset Management only.

## Data Source
Data is fetched from the SEC EDGAR database (https://data.sec.gov) using their public API. The SEC requires a User-Agent header for all requests.

## Frontend Access
- **UI Port:** http://localhost:3000
- **API Port:** http://localhost:5000

Navigate to the "13F Timeline" tab in the application to view the interactive timeline.

## Example Usage

### Using curl
```bash
# Get all entities (last 10 years)
curl http://localhost:5000/api/13f/timeline?years=10

# Get Berkshire only (last 5 years)
curl http://localhost:5000/api/13f/berkshire?years=5

# Get Scion only (last 15 years)
curl http://localhost:5000/api/13f/scion?years=15
```

### Using JavaScript
```javascript
// Fetch all entities
const response = await fetch('/api/13f/timeline?years=10');
const data = await response.json();

// Fetch Berkshire only
const berkshireResponse = await fetch('/api/13f/berkshire?years=10');
const berkshireData = await berkshireResponse.json();
```

## Notes
- The SEC API may have rate limiting. Be respectful with request frequency.
- Data is fetched in real-time from the SEC EDGAR database.
- Filings are organized by year and quarter for easy timeline visualization.
- The application filters for 13F-HR (initial) and 13F-HR/A (amended) forms only.



