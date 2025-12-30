import React from 'react';
import './HoldingsTable.css';

function HoldingsTable({ holdings, totalValue, loading, cashValue, investmentValue, cashPercentage, investmentPercentage, note }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (percent) => {
    return `${percent.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="holdings-loading">
        <p>Loading holdings data...</p>
      </div>
    );
  }

  if (!holdings || holdings.length === 0) {
    return (
      <div className="holdings-empty">
        <p>No holdings data available for this filing.</p>
        <p className="error-hint">
          The SEC filing may not be available in XML format, or the document structure has changed.
          Please try a different filing or check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="holdings-table-container">
      {note && (
        <div className="holdings-note" style={{
          padding: '15px',
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          marginBottom: '20px',
          color: '#856404'
        }}>
          <strong>ℹ️ Note:</strong> {note}
        </div>
      )}
      <div className="holdings-summary">
        <div className="summary-item">
          <span className="summary-label">Total Holdings:</span>
          <span className="summary-value">{holdings.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Portfolio Value:</span>
          <span className="summary-value">{formatCurrency(totalValue)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Investments:</span>
          <span className="summary-value investment">{formatCurrency(investmentValue || 0)} ({formatPercentage(investmentPercentage || 0)})</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Cash & Equivalents:</span>
          <span className="summary-value cash">{formatCurrency(cashValue || 0)} ({formatPercentage(cashPercentage || 0)})</span>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="holdings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Ticker</th>
              <th>Issuer Name</th>
              <th>Shares</th>
              <th>Change</th>
              <th>Value (USD)</th>
              <th>% of Portfolio</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding, index) => (
              <tr key={index} className={holding.isCash ? 'cash-holding' : ''}>
                <td className="rank">{index + 1}</td>
                <td className="ticker">
                  {holding.ticker ? (
                    <span className="ticker-badge">{holding.ticker}</span>
                  ) : (
                    <span className="no-ticker">-</span>
                  )}
                </td>
                <td className="issuer-name">
                  {holding.nameOfIssuer || 'N/A'}
                  {holding.isCash && <span className="cash-badge">Cash</span>}
                </td>
                <td className="shares">{formatNumber(holding.shares || 0)}</td>
                <td className="change">
                  {holding.isNew ? (
                    <span className="change-badge new">NEW</span>
                  ) : holding.changePercent !== undefined && holding.changePercent !== null ? (
                    <div className={`change-indicator ${holding.change > 0 ? 'positive' : holding.change < 0 ? 'negative' : 'neutral'}`}>
                      <span className="change-arrow">
                        {holding.change > 0 ? '⬆' : holding.change < 0 ? '⬇' : '−'}
                      </span>
                      <span className="change-percent">
                        {Math.abs(holding.changePercent).toFixed(1)}%
                      </span>
                    </div>
                  ) : (
                    <span className="change-na">-</span>
                  )}
                </td>
                <td className={`value ${holding.isCash ? 'cash-value' : ''}`}>
                  {formatCurrency(holding.value || 0)}
                </td>
                <td className="percentage">
                  <div className="percentage-bar-container">
                    <span className="percentage-value">
                      {formatPercentage(holding.percentage || 0)}
                    </span>
                    <div
                      className={`percentage-bar ${holding.isCash ? 'cash-bar' : ''}`}
                      style={{ width: `${Math.min(holding.percentage || 0, 100)}%` }}
                    ></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HoldingsTable;

