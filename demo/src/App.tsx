import ProfilePage from './pages/ProfilePage.tsx';
import StoreVisualizer from './components/StoreVisualizer.tsx';
import './App.css';

function App() {
  return (
    <div className="app-layout">
      <div className="header">
        <div className="header-left">
          <h1>
            <span>eventiq</span> demo
          </h1>
        </div>
      </div>

      <ProfilePage />
      <StoreVisualizer />
    </div>
  );
}

export default App;
