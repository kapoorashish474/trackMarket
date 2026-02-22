import React from 'react';
import HoldingsTable from './HoldingsTable';

function formatValue(v) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(2)}K`;
  return `$${Math.round(v)}`;
}

function HoldingsView({
    selectedFiling,
    holdings,
    loading,
    onClose,
    onRetry,
    formatDate
}) {
    const renderHighlight = (h) => {
        if (!h?.holdings?.length) return null;
        const list = h.holdings.filter(x => !x.isCash);
        const total = h.totalValue || 1;
        const normalizeKey = (name) => (name || '').trim().toUpperCase().replace(/\s+/g, ' ')
            .replace(/\s+CL\s+[A-Z]\s*$/i, '').replace(/\s+CLASS\s+[A-Z]\s*$/i, '').replace(/\.+$/, '').trim() || 'UNKNOWN';
        const byKey = new Map();
        list.forEach((item) => {
            const key = normalizeKey(item.nameOfIssuer);
            const value = parseFloat(item.value) || 0;
            if (!byKey.has(key)) {
                byKey.set(key, { nameOfIssuer: item.nameOfIssuer, value: 0, ticker: item.ticker });
            }
            const e = byKey.get(key);
            e.value += value;
            if ((item.nameOfIssuer || '').length < (e.nameOfIssuer || '').length) e.nameOfIssuer = item.nameOfIssuer;
            if (item.ticker) e.ticker = item.ticker;
        });
        const top5 = Array.from(byKey.values()).sort((a, b) => b.value - a.value).slice(0, 5);
        if (top5.length === 0) return null;
        return (
            <div className="highlight-section">
                <h3 className="highlight-title">Highlight — Top 5 holdings</h3>
                <ul className="highlight-list">
                    {top5.map((item, i) => (
                        <li key={`${item.nameOfIssuer}-${i}`} className="highlight-item">
                            <span className="highlight-rank">{i + 1}.</span>
                            <span className="highlight-name">
                                {item.nameOfIssuer || 'Unknown'}
                                {item.ticker && <span className="highlight-ticker"> ({item.ticker})</span>}
                            </span>
                            <span className="highlight-pct">
                                {(item.value / total * 100).toFixed(1)}%
                            </span>
                            <span className="highlight-value">{formatValue(item.value)}</span>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    if (!selectedFiling) {
        return (
            <div className="holdings-placeholder-container">
                <div className="holdings-placeholder-content">
                    <h3 className="placeholder-title">📊 Holdings Details</h3>
                    <p className="placeholder-text">
                        Click on any filing in the timeline to view detailed holdings
                    </p>
                    <p className="placeholder-subtext">
                        You'll see investment percentages, cash holdings, and all securities
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="holdings-section">
            <div className="holdings-header">
                <h3 className="holdings-title">
                    📊 Holdings for {selectedFiling.formType}
                </h3>
                <p className="holdings-filing-info">
                    Filed: {formatDate(selectedFiling.filingDate)} |
                    Report: {formatDate(selectedFiling.reportDate)}
                </p>
                <button
                    className="close-holdings-btn"
                    onClick={onClose}
                >
                    ✕ Close
                </button>
            </div>

            {loading ? (
                <div className="holdings-loading">
                    <p className="loading-text">⏳ Loading holdings data...</p>
                    <p className="loading-hint">Fetching from SEC EDGAR database...</p>
                </div>
            ) : holdings === null ? (
                <div className="holdings-preparing">
                    <p>Preparing to load holdings...</p>
                </div>
            ) : holdings?.error && !holdings?.holdings?.length ? (
                <div className="holdings-error">
                    <p className="error-message">
                        ⚠️ Unable to load holdings data
                    </p>
                    <p className="error-details">{holdings.error}</p>
                    <p className="error-hint">
                        The SEC filing may not be available in XML format yet. This is common for recent filings.
                        Please try a different filing or check back later.
                    </p>
                    <button
                        className="retry-btn"
                        onClick={onRetry}
                    >
                        🔄 Retry
                    </button>
                </div>
            ) : (
                <>
                    {renderHighlight(holdings)}
                    <div className="holdings-table-section">
                        <h3 className="holdings-table-section-title">All holdings</h3>
                        <HoldingsTable
                            holdings={holdings?.holdings || []}
                            totalValue={holdings?.totalValue || 0}
                            loading={false}
                            cashValue={holdings?.cashValue || 0}
                            investmentValue={holdings?.investmentValue || 0}
                            cashPercentage={holdings?.cashPercentage || 0}
                            investmentPercentage={holdings?.investmentPercentage || 0}
                            note={holdings?.note}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

export default HoldingsView;
