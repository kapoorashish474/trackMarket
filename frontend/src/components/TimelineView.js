import React from 'react';

function TimelineView({ data, selectedFiling, onFilingClick, formatDate, selectedQuarter, filingsWithNoHoldings = new Set() }) {
    if (!data || !data.timeline) return null;

    // Flatten all filings into a single list (newest first)
    const allFilings = [];
    const years = Object.keys(data.timeline)
        .map(y => parseInt(y))
        .sort((a, b) => b - a);

    years.forEach(year => {
        const yearData = data.timeline[year];
        let quarters = Object.keys(yearData.quarters).sort().reverse();
        if (selectedQuarter && selectedQuarter !== 'all') {
            quarters = quarters.filter(q => q === selectedQuarter);
        }
        quarters.forEach(quarter => {
            yearData.quarters[quarter].forEach(filing => {
                allFilings.push({ ...filing, year, quarter });
            });
        });
    });

    return (
        <div className="timeline">
            <div className="timeline-table-wrap">
                <table className="timeline-table">
                    <thead>
                        <tr>
                            <th>Year</th>
                            <th>Quarter</th>
                            <th>Type</th>
                            <th>Filed</th>
                            <th>Report</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {allFilings.map((filing, idx) => {
                            const hasNoHoldings = filingsWithNoHoldings.has(filing.accessionNumber);
                            return (
                                <tr
                                    key={`${filing.accessionNumber}-${idx}`}
                                    className={`filing-row ${selectedFiling?.accessionNumber === filing.accessionNumber ? 'selected' : ''} ${hasNoHoldings ? 'no-holdings' : ''}`}
                                    onClick={hasNoHoldings ? undefined : () => onFilingClick(filing)}
                                >
                                    <td>{filing.year}</td>
                                    <td>{filing.quarter}</td>
                                    <td>{filing.formType}</td>
                                    <td>{formatDate(filing.filingDate)}</td>
                                    <td>{formatDate(filing.reportDate)}</td>
                                    <td>
                                        {hasNoHoldings ? (
                                            <span className="filing-action disabled">No data</span>
                                        ) : (
                                            <span className="filing-action">View Holdings →</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default TimelineView;
