import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { NavigationMenu } from './components/Navbar/Navbar';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { HelpGettingStarted } from "./pages/Help/HelpSubGettingStarted";
import { HelpChartVisualization } from "./pages/Help/HelpSubChartVisualization";
import { HelpDataTypes } from "./pages/Help/HelpSubDataTypes";
import { HelpAnomalyDetection } from "./pages/Help/HelpSubAnomalyDetection";
import { HelpTroubleshooting } from "./pages/Help/HelpSubTroubleshooting";
import { HelpAbout } from "./pages/Help/HelpSubAbout";
import { HelpMetrics } from "./pages/Help/HelpSubMetrics";
import { HelpPlugins } from "./pages/Help/HelpSubPlugins";
import { HelpReports } from "./pages/Help/HelpSubReports";

const DashboardPage = React.lazy( () => import("./pages/DashboardPage"))
const DataPage = React.lazy( () => import("./pages/DataPage"))
const AnomalyPage = React.lazy( () => import("./pages/AnomalyPage"))
const MetricsPage = React.lazy( () => import("./pages/MetricsPage"))
const SettingsPage = React.lazy( () => import("./pages/Settings/SettingsPage"))
const HelpPage = React.lazy( () => import("./pages/Help/HelpPage"))

const App: React.FC = () => {
  return (
    <div className="App">
      <NavigationMenu />
      <main>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} /> {/* Ustawienie domyślnej strony startowej na DashboardPage */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/data" element={<DataPage />} />
            <Route path="/metrics" element={<MetricsPage />} />
            <Route path="/anomaly" element={<AnomalyPage />} />
            <Route path="/settings" element={<SettingsPage />}>
              {/* Add here settings subpages */}
            </Route>
            <Route path="/help" element={<HelpPage />}>
              <Route path="getting-started" element={<HelpGettingStarted />} />
              <Route path="data-types" element={<HelpDataTypes />} />
              <Route path="chart-visualization" element={<HelpChartVisualization />} />
              <Route path="metrics" element={<HelpMetrics />} />
              <Route path="plugins" element={<HelpPlugins />} />
              <Route path="anomaly-detection" element={<HelpAnomalyDetection />} />
              <Route path="reports" element={<HelpReports />} />
              <Route path="troubleshooting" element={<HelpTroubleshooting />} />
              <Route path="about" element={<HelpAbout />} />
            </Route>
          </Routes>
        </Suspense>
      </main>
    </div>  
  );
};

export default App;
