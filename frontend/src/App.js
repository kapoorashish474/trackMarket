import React, { useState } from 'react';
import './App.css';
import Timeline13F from './components/Timeline13F';

import MarketDataView from './components/MarketDataView';

function App() {
  const [activeTab, setActiveTab] = useState('stocks');

  const renderContent = () => {
    switch (activeTab) {
      case 'stocks':
        return <Timeline13F />;
      case 'gold':
        return <MarketDataView
          type="gold"
          title="Gold Price (USD/oz)"
          icon="🏆"
        />;
      case 'silver':
        return <MarketDataView
          type="silver"
          title="Silver Price (USD/oz)"
          icon="🥈"
        />;
      case 'debt':
        return <MarketDataView
          type="debt"
          title="US National Debt"
          icon="📉"
        />;
      default:
        return <Timeline13F />;
    }
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>TrackMarket</h1>
          <p>Financial Market Tracking & Analysis</p>
        </header>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'stocks' ? 'active' : ''}`}
            onClick={() => setActiveTab('stocks')}
          >
            📈 Stocks (13F)
          </button>
          <button
            className={`tab ${activeTab === 'gold' ? 'active' : ''}`}
            onClick={() => setActiveTab('gold')}
          >
            🏆 Gold
          </button>
          <button
            className={`tab ${activeTab === 'silver' ? 'active' : ''}`}
            onClick={() => setActiveTab('silver')}
          >
            🥈 Silver
          </button>
          <button
            className={`tab ${activeTab === 'debt' ? 'active' : ''}`}
            onClick={() => setActiveTab('debt')}
          >
            📉 US Debt
          </button>
        </div>

        <main className="main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;

