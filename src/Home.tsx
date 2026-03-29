import React, { useState } from 'react';
import { SUPABASE_URL } from './lib/supabase';
import App from './App';

const VERIFY_URL = SUPABASE_URL + '/functions/v1/verify-password';

export default function Home() {
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem('vocab_language') || null; } catch { return null; }
  });
  const [authenticated, setAuthenticated] = useState(() => {
    try {
      var token = localStorage.getItem('vocab_auth_token');
      if (!token) return false;
      var parts = token.split(':');
      if (parts.length < 3 || parts[0] !== 'vocab_auth') return false;
      var expires = parseInt(parts[1], 10);
      if (isNaN(expires) || Date.now() > expires) {
        localStorage.removeItem('vocab_auth_token');
        return false;
      }
      return true;
    } catch { return false; }
  });
  const [pendingLang, setPendingLang] = useState(null);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  function trySelectLanguage(lang) {
    if (authenticated) {
      localStorage.setItem('vocab_language', lang);
      setLanguage(lang);
    } else {
      setPendingLang(lang);
      setPassInput('');
      setPassError('');
    }
  }

  function submitPassword() {
    if (!passInput.trim()) return;
    setPassLoading(true);
    setPassError('');
    fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passInput })
    }).then(function(res) { return res.json(); }).then(function(data) {
      setPassLoading(false);
      if (data.ok && data.token) {
        localStorage.setItem('vocab_auth_token', data.token);
        localStorage.setItem('vocab_language', pendingLang);
        setAuthenticated(true);
        setLanguage(pendingLang);
        setPendingLang(null);
      } else {
        setPassError(data.error || 'Incorrect password');
      }
    }).catch(function() {
      setPassLoading(false);
      setPassError('Connection error. Please try again.');
    });
  }

  function goHome() {
    localStorage.removeItem('vocab_language');
    setLanguage(null);
  }

  if (language === 'german' && authenticated) {
    return <App onHome={goHome} />;
  }

  if (language === 'english' && authenticated) {
    return (
      <div className="app">
        <div className="home-header">
          <button onClick={goHome} style={{background:'none',border:'none',color:'#fff',fontSize:'14px',cursor:'pointer'}}>{'\u2190'} Back</button>
          <span style={{fontSize:'15px',fontWeight:600}}>English Vocabulary</span>
          <span></span>
        </div>
        <div className="content" style={{textAlign:'center',paddingTop:'60px'}}>
          <div style={{fontSize:'64px',marginBottom:'16px'}}>{'\uD83C\uDDEC\uD83C\uDDE7'}</div>
          <h1>Coming Soon!</h1>
          <p style={{color:'#718096',margin:'12px 0'}}>English vocabulary course is under development.</p>
          <button className="btn btn-primary" style={{marginTop:'20px',maxWidth:'200px',margin:'20px auto'}} onClick={goHome}>Back to Home</button>
        </div>
      </div>
    );
  }

  // Password prompt
  if (pendingLang) {
    return (
      <div className="app">
        <div className="home-header">
          <button onClick={function() { setPendingLang(null); }} style={{background:'none',border:'none',color:'#fff',fontSize:'14px',cursor:'pointer'}}>{'\u2190'} Back</button>
          <span style={{fontSize:'15px',fontWeight:700}}>Vocabulary Study</span>
          <span></span>
        </div>
        <div className="content" style={{paddingTop:'60px',textAlign:'center'}}>
          <div style={{fontSize:'48px',marginBottom:'12px'}}>{'\uD83D\uDD12'}</div>
          <h1 style={{fontSize:'18px',marginBottom:'16px'}}>Enter password to continue</h1>
          <input
            type="password"
            value={passInput}
            placeholder="Password"
            style={{maxWidth:'240px',margin:'0 auto',display:'block',textAlign:'center'}}
            onChange={function(e) { setPassInput(e.target.value); setPassError(''); }}
            onKeyDown={function(e) { if (e.key === 'Enter' && !passLoading) submitPassword(); }}
          />
          {passError ? <p style={{color:'#E74C3C',fontSize:'12px',marginTop:'8px'}}>{passError}</p> : null}
          <button
            className="btn btn-primary"
            style={{marginTop:'16px',maxWidth:'240px'}}
            disabled={passLoading}
            onClick={submitPassword}
          >{passLoading ? 'Verifying...' : 'Enter'}</button>
        </div>
      </div>
    );
  }

  // Home screen - language picker
  return (
    <div className="app">
      <div className="home-header">
        <span></span>
        <span style={{fontSize:'15px',fontWeight:700}}>Vocabulary Study</span>
        <span></span>
      </div>
      <div className="content" style={{paddingTop:'max(32px, env(safe-area-inset-top, 32px))'}}>
        <div style={{textAlign:'center',marginBottom:'30px'}}>
          <a href="https://uniques.vn/" target="_blank" rel="noopener noreferrer">
            <picture>
              <source srcSet={import.meta.env.BASE_URL + 'uniques-logo.webp'} type="image/webp" />
              <img src={import.meta.env.BASE_URL + 'uniques-logo.png'} alt="UniqueS" loading="lazy" style={{width:'160px',marginBottom:'16px'}} />
            </picture>
          </a>
          <h1 style={{fontSize:'20px',marginBottom:'4px',fontFamily:'Montserrat,sans-serif'}}>What would you like to study today?</h1>
          <p style={{color:'#7E9470',fontSize:'13px'}}>Choose a language to get started</p>
        </div>
        <div className="language-grid">
          <button className="language-card" onClick={function() { trySelectLanguage('german'); }}>
            <div className="language-flag">
              <img src="https://flagcdn.com/w80/de.png" alt="German flag" />
            </div>
            <div className="language-name">German</div>
            <div className="language-desc">{'1500 words \u2022 A1-B1'}</div>
            <div className="language-tag active-tag">Active</div>
          </button>
          <button className="language-card" onClick={function() { trySelectLanguage('english'); }}>
            <div className="language-flag">
              <img src="https://flagcdn.com/w80/gb.png" alt="English flag" />
            </div>
            <div className="language-name">English</div>
            <div className="language-desc">Coming soon</div>
            <div className="language-tag soon-tag">Soon</div>
          </button>
        </div>

      </div>
      <div style={{padding:'12px 16px',textAlign:'center',fontSize:'11px',color:'#A0AEC0',lineHeight:'1.6',flexShrink:0}}>
        <div>{'\u00A9 2026 Tam Tran Thanh. All rights reserved.'}</div>
        <div>Contact us: {' '}
          <a href="mailto:uniques@officience.com" style={{color:'#D67635',textDecoration:'none'}}>uniques@officience.com</a>
        </div>
      </div>
    </div>
  );
}
