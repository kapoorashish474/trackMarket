import React from 'react';
import './QuarterPortfolio.css';

function QuarterPortfolio({ quarter, filings, onFilingClick, selectedFiling }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (percent) => {
    return `${percent.toFixed(2)}%`;
  };

  // Calculate aggregate portfolio stats for the quarter
  const calculateQuarterStats = () => {
    // This would ideally come from the backend, but for now we'll show per-filing
    return {
      totalValue: 0,
      investmentValue: 0,
      cashValue: 0,
      investmentPercentage: 0,
      cashPercentage: 0
    };
  };

  const stats = calculateQuarterStats();

  return (
    <div className="quarter-portfolio">
      <div className="quarter-portfolio-header">
        <h4>{quarter}</h4>
        {stats.totalValue > 0 && (
          <div className="quarter-stats">
            <div className="stat-item">
              <span className="stat-label">Investments:</span>
              <span className="stat-value investment">
                {formatPercentage(stats.investmentPercentage)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Cash:</span>
              <span className="stat-value cash">
                {formatPercentage(stats.cashPercentage)}
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="filings-list">
        {filings.map((filing, idx) => (
          <div 
            key={idx} 
            className={`filing-item ${selectedFiling?.accessionNumber === filing.accessionNumber ? 'selected' : ''}`}
            onClick={() => onFilingClick(filing)}
          >
            <div className="filing-header">
              <div className="filing-type">{filing.formType}</div>
              <div className="filing-click-hint">Click to view holdings →</div>
            </div>
            <div className="filing-date">
              Filed: {new Date(filing.filingDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
            {filing.reportDate !== filing.filingDate && (
              <div className="filing-date">
                Report: {new Date(filing.reportDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default QuarterPortfolio;



