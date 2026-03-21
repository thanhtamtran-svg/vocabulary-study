import React from 'react';

export default function SyncBar({ syncEmail, syncStatus, syncMsg }) {
  if (!syncEmail) return null;
  return (
    <div className="sync-bar">
      <div className={'sync-dot ' +
        (syncStatus === 'syncing' ? 'syncing' : syncStatus === 'error' ? 'offline' : 'online')} />
      <span>
        {syncMsg || ('\u2601\uFE0F ' + syncEmail)}
      </span>
    </div>
  );
}
