import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import VerifyDocument from './components/VerifyDocument.tsx';
import './index.css';

// Public pages (prescription / certificate checks, pharmacy console) need no sign-in.
const isPublicPage = /^\/(rx|cert)\/[^/]+\/?$/.test(window.location.pathname) || window.location.pathname === '/pharmacy';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPublicPage ? <VerifyDocument path={window.location.pathname} /> : <App />}
  </StrictMode>,
);
