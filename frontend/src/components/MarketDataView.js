import React, { useState, useEffect } from 'react';
import './MarketDataView.css';

function MarketDataView({ type, title, icon }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tableMinimized, setTableMinimized] = useState(false);

    useEffect(() => {
        fetchData();
    }, [type]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Map type to API endpoint
            let endpoint = '';
            if (type === 'debt') endpoint = '/api/market/debt';
            else if (type === 'gold') endpoint = '/api/market/gold';
            else if (type === 'silver') endpoint = '/api/market/silver';

            const response = await fetch(endpoint);
            if (!response.ok) throw new Error('Failed to fetch market data');

            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(val);
    };

    const formatLargeCurrency = (val) => {
        // For trillions (US Debt)
        if (val >= 1e12) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(val / 1e12) + ' Trillion';
        }
        return formatCurrency(val);
    };

    if (loading) return <div className="market-loading">Loading {title}...</div>;
    if (error) return <div className="market-error">Error: {error}</div>;
    if (!data) return <div className="market-empty">No data available</div>;

    const currentPrice = data.current.amount || data.current.price;
    const isDebt = type === 'debt';

    return (
        <div className="market-view">
            <div className="market-header">
                <div className="market-icon">{icon}</div>
                <div className="market-title-group">
                    <h2>{title}</h2>
                    <div className="current-price">
                        {isDebt ? formatLargeCurrency(currentPrice) : formatCurrency(currentPrice)}
                    </div>
                    <div className="market-date">
                        As of {new Date(data.current.date).toLocaleDateString()}
                    </div>
                </div>
            </div>

            <div className="market-history">
                <button
                    type="button"
                    className="market-history-toggle"
                    onClick={() => setTableMinimized(!tableMinimized)}
                    aria-expanded={!tableMinimized}
                >
                    <h3>Historical Data (Yearly)</h3>
                    <span className="toggle-icon" aria-hidden="true">
                        {tableMinimized ? '▼ Expand' : '▲ Minimize'}
                    </span>
                </button>
                {!tableMinimized && (
                    <div className="table-wrapper">
                        <table className="market-table">
                            <thead>
                                <tr>
                                    <th>Year</th>
                                    <th>{isDebt ? 'Total Debt' : 'Price (USD)'}</th>
                                    <th>Change</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.history.map((record, index) => {
                                    const price = record.amount || record.price;
                                    const prevPrice = data.history[index + 1] ? (data.history[index + 1].amount || data.history[index + 1].price) : price;
                                    const change = price - prevPrice;
                                    const changePercent = (change / prevPrice) * 100;

                                    return (
                                        <tr key={index}>
                                            <td>{new Date(record.date).getFullYear()}</td>
                                            <td className="price-cell">
                                                {isDebt ? formatCurrency(price) : formatCurrency(price)}
                                            </td>
                                            <td className={`change-cell ${change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'}`}>
                                                {change > 0 ? '⬆' : change < 0 ? '⬇' : '−'} {Math.abs(changePercent).toFixed(2)}%
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MarketDataView;
