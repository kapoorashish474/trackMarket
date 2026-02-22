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
  const [filingsWithNoHoldings, setFilingsWithNoHoldings] = useState(new Set());
  const [returnData, setReturnData] = useState(null);
  const [returnLoading, setReturnLoading] = useState(false);

  // Generate list of years (current year and 5 years back)
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i <= 4; i++) {
      years.push(currentYear - i);
    }
    return years;
  };

  useEffect(() => {
    setSelectedQuarter('all');
    fetch13FData();
  }, [selectedEntity, selectedYear]);

  useEffect(() => {
    let cancelled = false;
    setReturnLoading(true);
    setReturnData(null);
    fetch(`/api/13f/${selectedEntity}/return`)
      .then(res => res.json())
      .then(d => { if (!cancelled) setReturnData(d); })
      .catch(() => { if (!cancelled) setReturnData({ error: 'Unavailable' }); })
      .finally(() => { if (!cancelled) setReturnLoading(false); });
    return () => { cancelled = true; };
  }, [selectedEntity]);

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

      // Check if holdings data is not available (error or empty with note about unavailability)
      if (holdingsData.error && !holdingsData.holdings?.length) {
        console.warn('Holdings data contains error:', holdingsData.error);
        // Mark this filing as having no holdings
        setFilingsWithNoHoldings(prev => new Set(prev).add(filing.accessionNumber));
      } else if (!holdingsData.holdings?.length) {
        // Check if it's an error case (note about unavailable data) vs valid empty holdings
        // If there's a note about data not being available, or if HoldingsTable would show error
        if (holdingsData.note && (
          holdingsData.note.includes('not available') || 
          holdingsData.note.includes('could not be accessed') ||
          holdingsData.note.includes('unavailable')
        )) {
          setFilingsWithNoHoldings(prev => new Set(prev).add(filing.accessionNumber));
        } else if (!holdingsData.totalValue && !holdingsData.note) {
          // Empty holdings with no total value and no note likely means data unavailable
          // (HoldingsTable will show the error message in this case)
          setFilingsWithNoHoldings(prev => new Set(prev).add(filing.accessionNumber));
        }
      } else {
        console.log('✅ Holdings loaded successfully:', holdingsData.holdings?.length || 0, 'items');
        console.log('Total value:', holdingsData.totalValue);
        // Remove from no-holdings set if it was previously marked
        setFilingsWithNoHoldings(prev => {
          const newSet = new Set(prev);
          newSet.delete(filing.accessionNumber);
          return newSet;
        });
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
      // Mark this filing as having no holdings
      setFilingsWithNoHoldings(prev => new Set(prev).add(filing.accessionNumber));
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
            <option value="dalalstreet">Dalal Street LLC (Mohnish Pabrai)</option>
            <option value="pershing">Pershing Square (Bill Ackman)</option>
            <option value="duquesne">Duquesne Family Office LLC (Stanley Druckenmiller)</option>
            <option value="cantorfitzgerald">Cantor Fitzgerald, L.P. (Howard Lutnick)</option>
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

      {!loading && !error && (
        <div className="data-availability-info" style={{
          padding: '12px 20px',
          background: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '0.85rem',
          color: '#1565c0'
        }}>
          <strong>ℹ️ Data Availability:</strong> The SEC API only returns filings from the last 2-3 years. 
          For older quarters or missing data, visit{' '}
          <a 
            href={`https://www.sec.gov/cgi-bin/browse-edgar?CIK=${data?.cik || ''}&type=13F-HR`} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{color: '#1976d2', textDecoration: 'underline'}}
          >
            SEC EDGAR
          </a>
          {' '}directly.
        </div>
      )}

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
              <div className="return-summary">
                {returnLoading ? (
                  <span className="return-label">Last year return: …</span>
                ) : returnData && typeof returnData.returnPercent === 'number' ? (
                  <>
                    <span className="return-label">Last year return (13F portfolio):</span>
                    <span className={`return-value ${returnData.returnPercent >= 0 ? 'positive' : 'negative'}`}>
                      {returnData.returnPercent >= 0 ? '+' : ''}{returnData.returnPercent.toFixed(2)}%
                    </span>
                    <span className="return-dates">
                      ({formatDate(returnData.priorReportDate)} → {formatDate(returnData.latestReportDate)})
                    </span>
                  </>
                ) : (
                  <span className="return-label">Last year return: N/A</span>
                )}
              </div>
              {data.totalFilings === 0 && (
                <div className="data-availability-notice" style={{
                  padding: '15px',
                  background: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '0.9rem',
                  color: '#856404'
                }}>
                  <strong>ℹ️ Note:</strong> No filings found for {selectedYear}. The SEC API only returns recent filings (typically last 2-3 years). 
                  For historical data, visit <a href={`https://www.sec.gov/cgi-bin/browse-edgar?CIK=${data.cik}&type=13F-HR`} target="_blank" rel="noopener noreferrer" style={{color: '#667eea'}}>SEC EDGAR</a> directly.
                </div>
              )}
              <TimelineView
                data={data}
                selectedFiling={selectedFiling}
                onFilingClick={fetchHoldings}
                formatDate={formatDate}
                selectedQuarter={selectedQuarter}
                filingsWithNoHoldings={filingsWithNoHoldings}
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
