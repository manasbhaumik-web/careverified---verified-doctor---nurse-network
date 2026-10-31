import {StrictMode} from 'react';
import SharedSummary from './components/SharedSummary.tsx';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import VerifyDocument from './components/VerifyDocument.tsx';
import PrivacyCentre from './components/PrivacyCentre.tsx';
import './index.css';
import { getLocale, loadCatalog } from './locale';

// Public pages (prescription / certificate checks, pharmacy console) need no sign-in.
const shareMatch = window.location.pathname.match(/^\/share\/([^/]+)\/?$/);
const isPublicPage = /^\/(rx|cert)\/[^/]+\/?$/.test(window.location.pathname) || window.location.pathname === '/pharmacy';

// Fetch the saved language's phrases first so the page does not flash English.
const ready = Promise.race([loadCatalog(getLocale().lang), new Promise(r => setTimeout(r, 1500))]);

ready.finally(() => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {shareMatch ? <SharedSummary token={shareMatch[1]} /> : isPublicPage ? <VerifyDocument path={window.location.pathname} /> : <App />}
    <PrivacyCentre />
  </StrictMode>,
));
