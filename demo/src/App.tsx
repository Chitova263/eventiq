import { useState } from 'react';
import DashboardPage from './pages/DashboardPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import StoreVisualizer from './components/StoreVisualizer.tsx';
import './App.css';

type Page = 'dashboard' | 'profile';

function App() {
  const [page, setPage] = useState<Page>('dashboard');

  return (
    <div className="app-layout">
      <div className="header">
        <div className="header-left">
          <h1>
            <span>eventiq</span> demo
          </h1>
        </div>
        <nav className="nav-tabs">
          <button className={`nav-tab ${page === 'dashboard' ? 'nav-tab-active' : ''}`} onClick={() => setPage('dashboard')}>
            Dashboard Builder
          </button>
          <button className={`nav-tab ${page === 'profile' ? 'nav-tab-active' : ''}`} onClick={() => setPage('profile')}>
            API Orchestration
          </button>
        </nav>
      </div>

      {/* Keep both mounted so hooks stay active */}
      <div style={{ display: page === 'dashboard' ? 'block' : 'none' }}>
        <DashboardPage />
      </div>
      <div style={{ display: page === 'profile' ? 'block' : 'none' }}>
        <ProfilePage />
      </div>

      <StoreVisualizer />
    </div>
  );
}

export default App;
