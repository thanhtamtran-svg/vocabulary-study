import { createRoot } from 'react-dom/client';
import './styles.css';
import Home from './Home.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { ToastProvider } from './components/Toast.jsx';

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <ToastProvider>
      <Home />
    </ToastProvider>
  </ErrorBoundary>
);
