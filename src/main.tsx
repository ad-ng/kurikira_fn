import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Landing, LegalPage } from './site';
import './styles.css';
import './site.css';

// Preserve existing Meta OAuth returns that may still target the former root dashboard.
if (window.location.pathname === '/' && new URLSearchParams(window.location.search).has('instagram')) {
  window.history.replaceState({}, '', `/app${window.location.search}`);
}
const path = window.location.pathname.replace(/\/$/, '') || '/';
const Page = path === '/privacy' ? <LegalPage kind="privacy" /> : path === '/terms' ? <LegalPage kind="terms" /> : path === '/app' ? <App /> : <Landing />;
document.title = path === '/privacy' ? 'Privacy policy — Kurikira' : path === '/terms' ? 'Terms & conditions — Kurikira' : path === '/app' ? 'Workspace — Kurikira' : 'Kurikira — Instagram comment to private reply';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{Page}</React.StrictMode>
);
