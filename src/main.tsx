import { createRoot } from 'react-dom/client';
import './styles.css';
import Home from './Home';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <ToastProvider>
      <Home />
    </ToastProvider>
  </ErrorBoundary>
);
