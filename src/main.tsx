import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Preload critical dashboard chunks in production
if (import.meta.env.MODE === 'production') {
  import('./pages/AdminDashboard');
  import('./pages/CoachDashboard');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
