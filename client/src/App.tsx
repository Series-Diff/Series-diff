import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { NavigationMenu } from './components/Navbar/Navbar';
import { CacheProvider } from './contexts/CacheContext';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { HelpGettingStarted } from "./pages/Help/HelpSubGettingStarted";
import { HelpChartVisualization } from "./pages/Help/HelpSubChartVisualization";
import { HelpDataTypes } from "./pages/Help/HelpSubDataTypes";
import { HelpTroubleshooting } from "./pages/Help/HelpSubTroubleshooting";
import { HelpAbout } from "./pages/Help/HelpSubAbout";
import { HelpMetrics } from "./pages/Help/HelpSubMetricsAndStatistics";
import { HelpPlugins } from "./pages/Help/HelpSubPlugins";
import { HelpReports } from "./pages/Help/HelpSubReports";

const API_URL = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');

const hydrateSessionToken = async () => {
  try {
    const token = localStorage.getItem('session_token');
    if (token) return; // Already have token, skip
    
    // Silent fetch to hydrate session token from backend
    const resp = await fetch(`${API_URL}/api/timeseries`, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    const newToken = resp.headers.get('X-Session-ID');
    if (newToken) {
      localStorage.setItem('session_token', newToken);
    }
  } catch (err) {
    // Silently fail - token hydration not critical on first load
  }
};

const DashboardPage = React.lazy( () => import("./pages/DashboardPage"))
const DataPage = React.lazy( () => import("./pages/DataPage"))
const AnomalyPage = React.lazy( () => import("./pages/AnomalyPage"))
const MetricsPage = React.lazy( () => import("./pages/MetricsPage"))
const HelpPage = React.lazy( () => import("./pages/Help/HelpPage"))

const App: React.FC = () => {
  // Hydrate session token on app mount (no loading state, silent fetch)
  useEffect(() => {
    hydrateSessionToken();
  }, []);

  return (
    <CacheProvider>
      <div className="App">
        <NavigationMenu />
        <main>
            <Suspense fallback={<div className="d-flex justify-content-center align-items-center min-vh-100">Loading...</div>}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} /> {/* Ustawienie domyślnej strony startowej na DashboardPage */}
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/data" element={<DataPage />} />
              <Route path="/metrics" element={<MetricsPage />} />
              <Route path="/anomaly" element={<AnomalyPage />} />
              <Route path="/help" element={<HelpPage />}>
                <Route path="getting-started" element={<HelpGettingStarted />} />
                <Route path="data-types" element={<HelpDataTypes />} />
                <Route path="chart-visualization" element={<HelpChartVisualization />} />
                <Route path="metrics" element={<HelpMetrics />} />
                <Route path="plugins" element={<HelpPlugins />} />
                <Route path="reports" element={<HelpReports />} />
                <Route path="troubleshooting" element={<HelpTroubleshooting />} />
                <Route path="about" element={<HelpAbout />} />
              </Route>
            </Routes>
          </Suspense>
        </main>
      </div>
    </CacheProvider>
  );
};

export default App;
