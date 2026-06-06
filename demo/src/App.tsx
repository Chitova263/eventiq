import { useState } from 'react';
import DashboardTab from './tabs/DashboardTab';
import CheckoutTab from './tabs/CheckoutTab';
import AnalyticsTab from './tabs/AnalyticsTab';

type Tab = 'react' | 'redux' | 'react-query';

export default function App() {
  const [tab, setTab] = useState<Tab>('react');

  return (
    <div className="app">
      <header className="app-header">
        <h1>eventiq</h1>
        <span className="app-subtitle">DAG workflow orchestration</span>
      </header>

      <nav className="tab-nav">
        <button className={tab === 'react' ? 'tab active' : 'tab'} onClick={() => setTab('react')}>
          @eventiq/react
        </button>
        <button className={tab === 'redux' ? 'tab active' : 'tab'} onClick={() => setTab('redux')}>
          @eventiq/redux
        </button>
        <button className={tab === 'react-query' ? 'tab active' : 'tab'} onClick={() => setTab('react-query')}>
          @eventiq/react-query
        </button>
      </nav>

      <main>
        {tab === 'react' && <DashboardTab />}
        {tab === 'redux' && <CheckoutTab />}
        {tab === 'react-query' && <AnalyticsTab />}
      </main>
    </div>
  );
}
