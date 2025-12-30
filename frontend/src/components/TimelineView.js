import React from 'react';

function TimelineView({ data, selectedFiling, onFilingClick, formatDate, selectedQuarter }) {
    if (!data || !data.timeline) return null;

    const years = Object.keys(data.timeline)
        .map(y => parseInt(y))
        .sort((a, b) => b - a);

    return (
        <div className="timeline">
            <div className="timeline-stats">
                <div className="stat">
                    <span className="stat-label">Total Filings:</span>
                    <span className="stat-value">{data.totalFilings}</span>
                </div>
                <div className="stat">
                    <span className="stat-label">Company:</span>
                    <span className="stat-value">{data.companyName}</span>
                </div>
            </div>

            <div className="years-container">
                {years.map(year => {
                    const yearData = data.timeline[year];
                    let quarters = Object.keys(yearData.quarters).sort().reverse();

                    // Filter quarters if a specific one is selected
                    if (selectedQuarter && selectedQuarter !== 'all') {
                        quarters = quarters.filter(q => q === selectedQuarter);
                    }

                    // If no quarters match (shouldn't happen for the selected year usually), don't render year block
                    if (quarters.length === 0) return null;

                    return (
                        <div key={year} className="year-block">
                            <div className="year-header">
                                <h4 className="year-title">{year}</h4>
                                <span className="year-count">{yearData.totalFilings} filing{yearData.totalFilings !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="quarters-container">
                                {quarters.map(quarter => {
                                    const quarterFilings = yearData.quarters[quarter];
                                    return (
                                        <div key={quarter} className="quarter-block">
                                            <div className="quarter-header">{quarter}</div>
                                            <div className="filings-list">
                                                {quarterFilings.map((filing, idx) => (
                                                    <div
                                                        key={`${filing.accessionNumber}-${idx}`}
                                                        className={`filing-item ${selectedFiling?.accessionNumber === filing.accessionNumber ? 'selected' : ''}`}
                                                        onClick={() => onFilingClick(filing)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <div className="filing-header">
                                                            <div className="filing-type">{filing.formType}</div>
                                                            <div className="filing-click-hint">Click here to view holdings →</div>
                                                        </div>
                                                        <div className="filing-date">
                                                            Filed: {formatDate(filing.filingDate)}
                                                        </div>
                                                        {filing.reportDate !== filing.filingDate && (
                                                            <div className="filing-date">
                                                                Report: {formatDate(filing.reportDate)}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default TimelineView;
