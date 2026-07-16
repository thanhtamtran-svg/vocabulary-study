import { createRoot } from 'react-dom/client';
import './styles.css';
import Home from './Home';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';

// B-010: apply the persisted theme before first paint (no white flash).
// The Settings toggle writes 'vocab_theme' and flips the same attribute.
try {
  if (localStorage.getItem('vocab_theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
} catch (e) { /* private mode etc. — default light */ }

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <ToastProvider>
      <Home />
    </ToastProvider>
  </ErrorBoundary>
);
