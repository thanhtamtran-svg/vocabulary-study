import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

var ToastContext = createContext(null);

var idCounter = 0;

export function ToastProvider({ children }) {
  var [toasts, setToasts] = useState([]);
  var timersRef = useRef({});

  var removeToast = useCallback(function(id) {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts(function(prev) { return prev.filter(function(t) { return t.id !== id; }); });
  }, []);

  var addToast = useCallback(function(message, type) {
    var id = ++idCounter;
    setToasts(function(prev) {
      // Keep max 3 toasts
      var updated = prev.length >= 3 ? prev.slice(1) : prev;
      return updated.concat([{ id: id, message: message, type: type }]);
    });
    timersRef.current[id] = setTimeout(function() {
      removeToast(id);
    }, 3000);
    return id;
  }, [removeToast]);

  var success = useCallback(function(msg) { return addToast(msg, 'success'); }, [addToast]);
  var error = useCallback(function(msg) { return addToast(msg, 'error'); }, [addToast]);
  var info = useCallback(function(msg) { return addToast(msg, 'info'); }, [addToast]);

  var typeStyles = {
    success: { background: '#7E9470', color: '#fff', borderColor: '#6d8360' },
    error: { background: '#E74C3C', color: '#fff', borderColor: '#c0392b' },
    info: { background: '#324A84', color: '#fff', borderColor: '#283d6e' }
  };

  var typeIcons = { success: '\u2705', error: '\u274C', info: '\u2139\uFE0F' };

  return React.createElement(ToastContext.Provider, {
    value: { success: success, error: error, info: info }
  },
    children,
    React.createElement('div', {
      style: {
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '90%',
        maxWidth: '400px',
        pointerEvents: 'none'
      }
    },
      toasts.map(function(toast) {
        var style = typeStyles[toast.type] || typeStyles.info;
        return React.createElement('div', {
          key: toast.id,
          style: {
            padding: '12px 16px',
            borderRadius: '10px',
            background: style.background,
            color: style.color,
            border: '1px solid ' + style.borderColor,
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'auto',
            cursor: 'pointer',
            animation: 'toastSlideIn 0.25s ease-out'
          },
          onClick: function() { removeToast(toast.id); }
        },
          React.createElement('span', null, typeIcons[toast.type] || ''),
          React.createElement('span', { style: { flex: 1 } }, toast.message)
        );
      })
    )
  );
}

export function useToast() {
  var ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback if used outside provider — won't crash
    return {
      success: function(msg) { console.log('[toast:success]', msg); },
      error: function(msg) { console.error('[toast:error]', msg); },
      info: function(msg) { console.info('[toast:info]', msg); }
    };
  }
  return ctx;
}
