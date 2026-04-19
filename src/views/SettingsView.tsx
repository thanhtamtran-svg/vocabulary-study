import React from 'react';
import Nav from '../components/Nav';
import { useToast } from '../components/Toast';
import { SUPABASE_URL } from '../lib/supabase';
import { dateKey } from '../lib/dates';
import { VAPID_PUBLIC_KEY } from '../lib/constants';

function urlBase64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  var rawData = window.atob(base64);
  var outputArray = new Uint8Array(rawData.length);
  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  var basePath = new URL('.', window.location.href).pathname;
  var reg = await navigator.serviceWorker.register(basePath + 'sw.js?v=5');
  await navigator.serviceWorker.ready;
  return reg;
}

async function subscribeToPush(reg) {
  var sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });
  return sub;
}

const PUSH_SUB_URL = SUPABASE_URL + '/functions/v1/push-subscription';

async function savePushSubscription(sub, email, reminderHour) {
  var keys = sub.toJSON().keys;
  var res = await fetch(PUSH_SUB_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'save',
      endpoint: sub.endpoint,
      email: email || null,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
      reminderHour: reminderHour || 8,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
    })
  });
  return res.ok;
}

async function updateReminderHour(endpoint, hour) {
  var res = await fetch(PUSH_SUB_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update-hour', endpoint, reminderHour: hour })
  });
  return res.ok;
}

async function deactivatePushSubscription(endpoint) {
  var res = await fetch(PUSH_SUB_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'deactivate', endpoint })
  });
  return res.ok;
}

export default React.memo(function SettingsView({
  onNavigate, onHome, syncEmail, syncStatus, syncMsg, langFlag,
  startDate, setStartDate, studyDay, weekNum, phase,
  connectSync, disconnectSync,
  pushEnabled, setPushEnabled, pushLoading, setPushLoading,
  pushSubscription, setPushSubscription,
  reminderHour, setReminderHour,
  resetStep, setResetStep, resetPass, setResetPass, resetError, setResetError,
  setProgress, setTodayCompleted,
  exportProgress, importProgress
}) {
  var toast = useToast();
  var VERIFY_URL = SUPABASE_URL + '/functions/v1/verify-password';

  return (
    <div className="app">
      <Nav active="settings" onNavigate={onNavigate} onHome={onHome}
        syncEmail={syncEmail} syncStatus={syncStatus} syncMsg={syncMsg} langFlag={langFlag} />
      <div className="content">
        <h1>Settings</h1>

        <div className="card">
          <div className="settings-row">
            <span>Start date</span>
            <input
              type="date"
              value={dateKey(startDate)}
              style={{width:'auto'}}
              onChange={function(e) {
                var d = new Date(e.target.value + 'T00:00:00');
                if (!isNaN(d)) setStartDate(d);
              }}
            />
          </div>
          <div className="settings-row">
            <span>Current study day</span>
            <strong>{studyDay}</strong>
          </div>
          <div className="settings-row">
            <span>Week / Phase</span>
            <span>{'Week ' + weekNum + ' / Phase ' + phase}</span>
          </div>
          <div className="settings-row">
            <span>Auto-save</span>
            <span style={{color:'#27AE60',fontWeight:600}}>{'\u2705 Enabled'}</span>
          </div>
        </div>

        <h2>Cloud Sync</h2>
        <div className="card">
          <p style={{fontSize:'12px',color:'#718096',marginBottom:'10px'}}>
            Sync progress across devices. Enter the same email on each device to keep them in sync.
          </p>
          {syncEmail ?
            <div>
              <div className="settings-row">
                <span>Synced as</span>
                <strong style={{fontSize:'12px'}}>{syncEmail}</strong>
              </div>
              <div className="settings-row">
                <span>Status</span>
                <span style={{color: syncStatus === 'error' ? '#E74C3C' : '#27AE60', fontWeight:600, fontSize:'12px'}}>
                  {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Error' : 'Connected'}
                </span>
              </div>
              <div className="btn-group" style={{marginTop:'10px'}}>
                <button className="btn btn-primary btn-sm"
                  onClick={function() { connectSync(syncEmail); }}>
                  Sync Now
                </button>
                <button className="btn btn-secondary btn-sm"
                  style={{color:'#E74C3C'}}
                  onClick={disconnectSync}>
                  Disconnect
                </button>
              </div>
            </div> :
            <div>
              <input
                type="email"
                id="sync-email-input"
                placeholder="Enter your email..."
                style={{marginBottom:'8px'}}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={function() {
                  var email = document.getElementById('sync-email-input').value.trim();
                  if (email && email.includes('@')) connectSync(email);
                  else toast.error('Please enter a valid email');
                }}
              >Connect</button>
            </div>
          }
        </div>

        <h2>Daily Reminder</h2>
        <div className="card">
          <p style={{fontSize:'12px',color:'#718096',marginBottom:'10px'}}>
            Get a daily push notification reminding you to study. Works on Android and iOS (Add to Home Screen required).
          </p>
          {!('PushManager' in window) ?
            <p style={{fontSize:'12px',color:'#E74C3C'}}>
              Push notifications are not supported in this browser. On iOS, add this app to your Home Screen first.
            </p> :
          pushEnabled ?
            <div>
              <div className="settings-row">
                <span>Status</span>
                <span style={{color:'#27AE60',fontWeight:600}}>{'\uD83D\uDD14 Active'}</span>
              </div>
              <div className="settings-row">
                <span>Remind me at</span>
                <select
                  value={reminderHour}
                  style={{padding:'6px 10px',borderRadius:'6px',border:'1px solid #e2e8f0',fontSize:'13px'}}
                  onChange={function(e) {
                    var hour = parseInt(e.target.value);
                    setReminderHour(hour);
                    localStorage.setItem('vocab_reminder_hour', hour);
                    if (pushSubscription) {
                      updateReminderHour(pushSubscription.endpoint, hour);
                    }
                  }}
                >
                  <option value={6}>6:00 AM</option>
                  <option value={7}>7:00 AM</option>
                  <option value={8}>8:00 AM</option>
                  <option value={9}>9:00 AM</option>
                  <option value={10}>10:00 AM</option>
                  <option value={11}>11:00 AM</option>
                  <option value={12}>12:00 PM</option>
                  <option value={13}>1:00 PM</option>
                  <option value={14}>2:00 PM</option>
                  <option value={15}>3:00 PM</option>
                  <option value={16}>4:00 PM</option>
                  <option value={17}>5:00 PM</option>
                  <option value={18}>6:00 PM</option>
                  <option value={19}>7:00 PM</option>
                  <option value={20}>8:00 PM</option>
                  <option value={21}>9:00 PM</option>
                </select>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                style={{marginTop:'10px',color:'#E74C3C'}}
                onClick={function() {
                  setPushLoading(true);
                  if (pushSubscription) {
                    deactivatePushSubscription(pushSubscription.endpoint).then(function() {
                      pushSubscription.unsubscribe();
                      setPushSubscription(null);
                      setPushEnabled(false);
                      setPushLoading(false);
                    });
                  }
                }}
              >Disable Reminders</button>
            </div> :
            <button
              className="btn btn-primary"
              disabled={pushLoading}
              onClick={function() {
                setPushLoading(true);
                registerServiceWorker().then(function(reg) {
                  if (!reg) {
                    toast.error('Service Worker not supported');
                    setPushLoading(false);
                    return;
                  }
                  return Notification.requestPermission().then(function(perm) {
                    if (perm !== 'granted') {
                      toast.error('Notification permission denied. Please enable it in browser settings.');
                      setPushLoading(false);
                      return;
                    }
                    return subscribeToPush(reg).then(function(sub) {
                      return savePushSubscription(sub, syncEmail, reminderHour).then(function(ok) {
                        if (ok) {
                          setPushSubscription(sub);
                          setPushEnabled(true);
                        } else {
                          toast.error('Failed to save subscription. Please try again.');
                        }
                        setPushLoading(false);
                      });
                    });
                  });
                }).catch(function(err) {
                  toast.error('Failed to enable notifications. Please try again.');
                  setPushLoading(false);
                });
              }}
            >{pushLoading ? 'Enabling...' : '\uD83D\uDD14 Enable Daily Reminder'}</button>
          }
        </div>

        <h2>Reset</h2>
        <div className="card">
          <p style={{fontSize:'12px',color:'#94a3b8',marginBottom:'10px'}}>
            This will permanently delete all your learning progress. This action cannot be undone.
          </p>

          {/* Step 0: Show reset button */}
          {resetStep === 0 ? <button
            className="btn btn-secondary"
            style={{color:'#E74C3C'}}
            onClick={function() { setResetStep(1); }}
          >Reset All Progress</button> : null}

          {/* Step 1: Are you sure? */}
          {resetStep === 1 ? <div>
            <p style={{fontSize:'13px',color:'#E74C3C',fontWeight:600,marginBottom:'10px'}}>
              {'\u26A0\uFE0F Are you sure? All your progress will be permanently lost.'}
            </p>
            <div className="btn-group">
              <button
                className="btn btn-secondary btn-sm"
                onClick={function() { setResetStep(0); }}
              >Cancel</button>
              <button
                className="btn btn-sm"
                style={{background:'#E74C3C',color:'#fff'}}
                onClick={function() { setResetStep(2); setResetPass(''); setResetError(''); }}
              >Yes, reset everything</button>
            </div>
          </div> : null}

          {/* Step 2: Enter password */}
          {resetStep === 2 ? <div>
            <p style={{fontSize:'13px',color:'#2E3033',fontWeight:600,marginBottom:'10px'}}>
              {'\uD83D\uDD12 Enter your password to confirm reset'}
            </p>
            <input
              type="password"
              value={resetPass}
              placeholder="Password"
              style={{marginBottom:'8px'}}
              onChange={function(e) { setResetPass(e.target.value); setResetError(''); }}
              onKeyDown={function(e) { if (e.key === 'Enter') document.getElementById('reset-confirm-btn')?.click(); }}
            />
            {resetError ? <p style={{color:'#E74C3C',fontSize:'12px',marginBottom:'8px'}}>{resetError}</p> : null}
            <div className="btn-group">
              <button
                className="btn btn-secondary btn-sm"
                onClick={function() { setResetStep(0); setResetPass(''); setResetError(''); }}
              >Cancel</button>
              <button
                id="reset-confirm-btn"
                className="btn btn-sm"
                style={{background:'#E74C3C',color:'#fff'}}
                disabled={resetStep === 3}
                onClick={function() {
                  if (!resetPass.trim()) { setResetError('Please enter your password'); return; }
                  setResetStep(3);
                  fetch(VERIFY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: resetPass })
                  }).then(function(res) { return res.json(); }).then(function(data) {
                    if (data.ok) {
                      setProgress({});
                      setTodayCompleted({learnCount: 0, learnedBatches: [], reviews: {}});
                      setResetStep(0);
                      setResetPass('');
                      toast.success('All progress has been reset.');
                    } else {
                      setResetError(data.error || 'Incorrect password');
                      setResetStep(2);
                    }
                  }).catch(function() {
                    setResetError('Connection error. Please try again.');
                    setResetStep(2);
                  });
                }}
              >{resetStep === 3 ? 'Verifying...' : 'Confirm Reset'}</button>
            </div>
          </div> : null}
        </div>

        <h2>Backup & Restore</h2>
        <div className="card">
          <p style={{fontSize:'12px',color:'#94a3b8',marginBottom:'10px'}}>
            Your progress saves automatically to this browser. Use export/import for backup or to transfer between devices.
          </p>
          <div className="btn-group">
            <button className="btn btn-primary" onClick={exportProgress}>
              {'\uD83D\uDCBE'} Export Backup
            </button>
            <label className="btn btn-secondary" style={{cursor:'pointer'}}>
              {'\uD83D\uDCC2'} Import
              <input
                type="file"
                accept=".json"
                onChange={importProgress}
                style={{display:'none'}}
              />
            </label>
          </div>
        </div>

        {onHome ? <div className="card" style={{marginTop:'16px'}}>
          <h2>Language</h2>
          <button
            className="btn btn-secondary"
            style={{marginTop:'8px'}}
            onClick={onHome}
          >{'\uD83C\uDF10'} Switch Language</button>
        </div> : null}
      </div>
    </div>
  );
})
