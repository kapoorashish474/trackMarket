import React from 'react';
import HoldingsTable from './HoldingsTable';

function HoldingsView({
    selectedFiling,
    holdings,
    loading,
    onClose,
    onRetry,
    formatDate
}) {
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
            )}
        </div>
    );
}

export default HoldingsView;
