import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Auto-reload on stale chunk errors (dynamic import fails after deploy)
    if (error && error.message && error.message.includes('dynamically imported module')) {
      if (!sessionStorage.getItem('chunk_reload')) {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        className: 'app',
        style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px' }
      },
        React.createElement('div', {
          style: {
            background: '#fff', borderRadius: '16px', padding: '32px 24px',
            textAlign: 'center', maxWidth: '360px', width: '100%',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #F5EBDC'
          }
        },
          React.createElement('div', { style: { fontSize: '48px', marginBottom: '16px' } }, '\u26A0\uFE0F'),
          React.createElement('h2', {
            style: { fontFamily: "'Montserrat',sans-serif", fontSize: '18px', color: '#2E3033', marginBottom: '8px' }
          }, 'Something went wrong'),
          React.createElement('p', {
            style: { fontSize: '13px', color: '#718096', marginBottom: '20px', lineHeight: '1.5' }
          }, 'An unexpected error occurred. Please try again.'),
          this.state.error ? React.createElement('pre', {
            style: { fontSize: '10px', color: '#E74C3C', background: '#fef2f2', padding: '8px', borderRadius: '8px', marginBottom: '12px', textAlign: 'left', overflow: 'auto', maxHeight: '120px', wordBreak: 'break-all' }
          }, String(this.state.error)) : null,
          React.createElement('button', {
            className: 'btn btn-primary',
            style: { maxWidth: '200px', margin: '0 auto' },
            onClick: function() {
              this.setState({ hasError: false, error: null });
            }.bind(this)
          }, 'Try Again'),
          React.createElement('button', {
            className: 'btn btn-secondary',
            style: { maxWidth: '200px', margin: '8px auto 0', fontSize: '12px' },
            onClick: function() { window.location.reload(); }
          }, 'Reload Page')
        )
      );
    }
    return this.props.children;
  }
}
