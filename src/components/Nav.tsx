import React from 'react';

export default React.memo(function Nav({ active, onNavigate, onHome, syncEmail, syncStatus, syncMsg, langFlag }) {
  var langFlagUrl = langFlag || 'https://flagcdn.com/w40/de.png';
  var items = [
    {id: 'dashboard', icon: '\uD83C\uDFE0', label: 'Home'},
    {id: 'progress', icon: '\uD83D\uDCC8', label: 'Progress'},
    {id: 'browse', icon: '\uD83D\uDCDA', label: 'Browse'},
    {id: 'settings', icon: '\u2699\uFE0F', label: 'Settings'}
  ];
  return <>
    <nav className="nav">
      {onHome ? <button
        key="lang"
        onClick={onHome}
        style={{minWidth:'46px',padding:'10px 4px 8px',display:'flex',alignItems:'center',justifyContent:'center'}}
      >
        <img
          src={langFlagUrl}
          alt="Language"
          style={{width:'24px',height:'18px',objectFit:'cover',borderRadius:'2px'}}
        />
      </button> : null}
      {items.map(function(item) {
        return <button
          key={item.id}
          className={active === item.id ? 'active' : ''}
          onClick={function() { onNavigate(item.id); }}
        >{item.icon + ' ' + item.label}</button>;
      })}
    </nav>
    {syncEmail ? <div className="sync-bar">
      <div className={'sync-dot ' +
        (syncStatus === 'syncing' ? 'syncing' : syncStatus === 'error' ? 'offline' : 'online')} />
      <span>
        {syncMsg || ('\u2601\uFE0F ' + syncEmail)}
      </span>
    </div> : null}
  </>;
})
