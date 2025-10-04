import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { AppProvider } from './context/AppContext';
import TeachersPage from './pages/TeachersPage';
import CalendarPage from './pages/CalendarPage';
import AttendancePage from './pages/AttendancePage';
import WorkSchedulePage from './pages/WorkSchedulePage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/" element={<AttendancePage />} />
            <Route path="/teachers" element={<TeachersPage />} />
            <Route path="/work-schedule" element={<WorkSchedulePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppProvider>
  );
}

export default App;