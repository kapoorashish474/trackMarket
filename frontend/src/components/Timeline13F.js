import React, { useState, useEffect, useCallback } from 'react';
import './Timeline13F.css';
import TimelineView from './TimelineView';
import HoldingsView from './HoldingsView';

function Timeline13F() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState('berkshire');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState('all');
  const [selectedFiling, setSelectedFiling] = useState(null);
  const [holdings, setHoldings] = useState(null);
  const [holdingsLoading, setHoldingsLoading] = useState(false);

  // Generate list of years (current year and 10 years back)
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i <= 10; i++) {
      years.push(currentYear - i);
    }
    return years;
  };

  useEffect(() => {
    setSelectedQuarter('all');
    fetch13FData();
  }, [selectedEntity, selectedYear]);

  const fetch13FData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSelectedFiling(null);
      setHoldings(null);

      const url = `/api/13f/${selectedEntity}?year=${selectedYear}`;
      console.log('Fetching 13F data from:', url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch 13F data');
      }
      const result = await response.json();
      console.log('13F data received:', result);
      setData(result);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching 13F data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedEntity, selectedYear]);

  const fetchHoldings = async (filing) => {
    console.log('=== fetchHoldings CALLED ===');
    console.log('Filing:', filing);

    // Set selected filing FIRST so the section appears immediately
    console.log('Setting selectedFiling to show holdings section...');
    setSelectedFiling(filing);
    setHoldingsLoading(true);
    setHoldings(null);

    try {
      // Find previous filing for comparison
      let previousFiling = null;
      if (data && data.timeline) {
        // Flatten all filings from all years into a single list
        const allFilings = [];
        Object.keys(data.timeline).sort((a, b) => b - a).forEach(year => {
          const quarters = data.timeline[year].quarters;
          Object.keys(quarters).sort().reverse().forEach(q => {
            allFilings.push(quarters[q]);
          });
        });

        // Find current filing index
        const currentIndex = allFilings.findIndex(f => f.accessionNumber === filing.accessionNumber);
        if (currentIndex !== -1 && currentIndex < allFilings.length - 1) {
          previousFiling = allFilings[currentIndex + 1];
          console.log('Found previous filing for comparison:', previousFiling);
        }
      }

      const accessionParam = encodeURIComponent(filing.accessionNumber);
      const cikParam = encodeURIComponent(filing.cik);

      let url = `/api/13f/holdings?accessionNumber=${accessionParam}&cik=${cikParam}`;

      // Add previous filing params if available
      if (previousFiling) {
        const prevAccessionParam = encodeURIComponent(previousFiling.accessionNumber);
        const prevCikParam = encodeURIComponent(previousFiling.cik);
        url += `&previousAccessionNumber=${prevAccessionParam}&previousCik=${prevCikParam}`;
      }

      console.log('Making API call to:', url);

      const response = await fetch(url);
      console.log('Response received, status:', response.status);

      const holdingsData = await response.json();
      console.log('Holdings data received:', holdingsData);
      console.log('Holdings count:', holdingsData.holdings?.length || 0);

      // Always set holdings
      setHoldings(holdingsData);

      if (holdingsData.error && !holdingsData.holdings?.length) {
        console.warn('Holdings data contains error:', holdingsData.error);
      } else {
        console.log('✅ Holdings loaded successfully:', holdingsData.holdings?.length || 0, 'items');
        console.log('Total value:', holdingsData.totalValue);
      }
    } catch (err) {
      console.error('Exception fetching holdings:', err);
      setHoldings({
        holdings: [],
        totalValue: 0,
        totalHoldings: 0,
        cashValue: 0,
        investmentValue: 0,
        cashPercentage: 0,
        investmentPercentage: 0,
        error: err.message
      });
    } finally {
      console.log('Setting loading to false');
      setHoldingsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAvailableQuarters = () => {
    if (!data || !data.timeline || !data.timeline[selectedYear]) return [];
    return Object.keys(data.timeline[selectedYear].quarters).sort().reverse();
  };

  return (
    <div className="timeline13f">
      <div className="timeline-controls">
        <div className="control-group">
          <label htmlFor="entity-select">Investor:</label>
          <select
            id="entity-select"
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="control-select"
          >
            <option value="berkshire">Berkshire Hathaway (Warren Buffett)</option>
            <option value="scion">Scion Asset Management</option>
            <option value="bridgewater">Bridgewater Associates (Ray Dalio)</option>
            <option value="pershing">Pershing Square (Bill Ackman)</option>

            <option value="baupost">Baupost Group (Seth Klarman)</option>
            <option value="valueact">ValueAct Capital</option>
            <option value="appaloosa">Appaloosa Management (David Tepper)</option>
            <option value="duquesne">Duquesne Family Office (Stanley Druckenmiller)</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="year-select">Year:</label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="control-select"
          >
            {getYearOptions().map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="quarter-select">Quarter:</label>
          <select
            id="quarter-select"
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="control-select"
            disabled={!data || !data.timeline || !data.timeline[selectedYear]}
          >
            <option value="all">All Quarters</option>
            {getAvailableQuarters().map(quarter => (
              <option key={quarter} value={quarter}>{quarter}</option>
            ))}
          </select>
        </div>

        <button onClick={fetch13FData} className="refresh-btn" disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading && (
        <div className="loading-container">
          <p>Loading 13F timeline data for {selectedYear}...</p>
        </div>
      )}

      {error && (
        <div className="error-container">
          <p className="error-message">Error: {error}</p>
          <p className="error-hint">Please check your connection and try again.</p>
        </div>
      )}

      {!loading && !error && data && (
        <div className="main-layout">
          {/* Left Column - Timeline */}
          <div className="left-column">
            <div className="timeline-content">
              <h2 className="entity-title">{data.companyName}</h2>
              <TimelineView
                data={data}
                selectedFiling={selectedFiling}
                onFilingClick={fetchHoldings}
                formatDate={formatDate}
                selectedQuarter={selectedQuarter}
              />
            </div>
          </div>

          {/* Right Column - Holdings Details */}
          <div className="right-column">
            <HoldingsView
              selectedFiling={selectedFiling}
              holdings={holdings}
              loading={holdingsLoading}
              onClose={() => {
                console.log('Closing holdings section');
                setSelectedFiling(null);
                setHoldings(null);
              }}
              onRetry={() => {
                console.log('Retry clicked');
                fetchHoldings(selectedFiling);
              }}
              formatDate={formatDate}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Timeline13F;
