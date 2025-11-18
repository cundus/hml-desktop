import { useState, useEffect } from 'react'
import {
  Cloud,
  CloudOff,
  Sync,
  CloudDownload,
  CloudUpload,
  CheckCircle,
  Cancel,
  Warning
} from '@mui/icons-material'
import React from 'react'

interface SyncStatus {
  isCloudConnected: boolean
  lastSyncTime: string
  unsyncedRecordsCount: number
  deviceId: string
}

interface SyncResult {
  success: boolean
  pulled: number
  pushed: number
  conflicts: number
  errors: string[]
  timestamp: string
}

export function CloudSync(): React.JSX.Element {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)
  const [cloudUrl, setCloudUrl] = useState('')
  const [showConnectDialog, setShowConnectDialog] = useState(false)

  // Load sync status on mount
  useEffect(() => {
    loadStatus()
    // Refresh status every 30 seconds
    const interval = setInterval(loadStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadStatus = async (): Promise<void> => {
    try {
      const response = await window.api.db.sync.getStatus()
      if (response.success && response.data) {
        setStatus(response.data)
      }
    } catch (error) {
      console.error('Failed to load sync status:', error)
    }
  }

  const handleConnect = async (): Promise<void> => {
    if (!cloudUrl.trim()) {
      alert('Please enter a cloud database URL')
      return
    }

    setSyncing(true)
    try {
      const response = await window.api.db.sync.connect(cloudUrl)
      if (response.success) {
        setShowConnectDialog(false)
        await loadStatus()

        // Perform initial sync
        await handleInitialSync()
      } else {
        alert(`Connection failed: ${response.error}`)
      }
    } catch (error) {
      alert(`Connection error: ${error}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async (): Promise<void> => {
    setSyncing(true)
    try {
      const response = await window.api.db.sync.disconnect()
      if (response.success) {
        await loadStatus()
        setLastResult(null)
      }
    } catch (error) {
      console.error('Disconnect error:', error)
    } finally {
      setSyncing(false)
    }
  }

  const handleFullSync = async (): Promise<void> => {
    setSyncing(true)
    try {
      const response = await window.api.db.sync.fullSync()
      if (response.success && response.data) {
        setLastResult(response.data)
        await loadStatus()
      } else {
        alert(`Sync failed: ${response.error}`)
      }
    } catch (error) {
      alert(`Sync error: ${error}`)
    } finally {
      setSyncing(false)
    }
  }

  const handlePull = async (): Promise<void> => {
    setSyncing(true)
    try {
      const response = await window.api.db.sync.pull()
      if (response.success && response.data) {
        setLastResult(response.data)
        await loadStatus()
      }
    } catch (error) {
      console.error('Pull error:', error)
    } finally {
      setSyncing(false)
    }
  }

  const handlePush = async (): Promise<void> => {
    setSyncing(true)
    try {
      const response = await window.api.db.sync.push()
      if (response.success && response.data) {
        setLastResult(response.data)
        await loadStatus()
      }
    } catch (error) {
      console.error('Push error:', error)
    } finally {
      setSyncing(false)
    }
  }

  const handleInitialSync = async (): Promise<void> => {
    setSyncing(true)
    try {
      const response = await window.api.db.sync.initialSync()
      if (response.success && response.data) {
        setLastResult(response.data)
        await loadStatus()
      }
    } catch (error) {
      console.error('Initial sync error:', error)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            {status?.isCloudConnected ? (
              <Cloud sx={{ color: '#3b82f6' }} />
            ) : (
              <CloudOff sx={{ color: '#9ca3af' }} />
            )}
            Cloud Sync
          </h2>

          {status?.isCloudConnected ? (
            <button
              onClick={handleDisconnect}
              disabled={syncing}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => setShowConnectDialog(true)}
              disabled={syncing}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Connect to Cloud
            </button>
          )}
        </div>

        {/* Status Display */}
        {status && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600">Status</div>
              <div className="text-lg font-semibold">
                {status.isCloudConnected ? (
                  <span className="text-green-600">Connected</span>
                ) : (
                  <span className="text-gray-400">Offline</span>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600">Unsynced Records</div>
              <div className="text-lg font-semibold text-orange-600">
                {status.unsyncedRecordsCount}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600">Last Sync</div>
              <div className="text-lg font-semibold text-gray-800">
                {new Date(status.lastSyncTime).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Sync Actions */}
        {status?.isCloudConnected && (
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleFullSync}
              disabled={syncing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              <Sync className={syncing ? 'animate-spin' : ''} sx={{ fontSize: 20 }} />
              Full Sync
            </button>

            <button
              onClick={handlePull}
              disabled={syncing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              <CloudDownload sx={{ fontSize: 20 }} />
              Pull from Cloud
            </button>

            <button
              onClick={handlePush}
              disabled={syncing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              <CloudUpload sx={{ fontSize: 20 }} />
              Push to Cloud
            </button>
          </div>
        )}

        {/* Last Sync Result */}
        {lastResult && (
          <div
            className={`p-4 rounded ${lastResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {lastResult.success ? (
                <CheckCircle sx={{ color: '#16a34a', fontSize: 20 }} />
              ) : (
                <Cancel sx={{ color: '#dc2626', fontSize: 20 }} />
              )}
              <span className="font-semibold">
                {lastResult.success ? 'Sync Completed' : 'Sync Failed'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Pulled:</span>
                <span className="ml-2 font-semibold">{lastResult.pulled}</span>
              </div>
              <div>
                <span className="text-gray-600">Pushed:</span>
                <span className="ml-2 font-semibold">{lastResult.pushed}</span>
              </div>
              <div>
                <span className="text-gray-600">Conflicts:</span>
                <span className="ml-2 font-semibold text-orange-600">{lastResult.conflicts}</span>
              </div>
            </div>

            {lastResult.errors.length > 0 && (
              <div className="mt-3 text-sm text-red-600">
                <div className="font-semibold mb-1">Errors:</div>
                {lastResult.errors.map((error, index) => (
                  <div key={index} className="ml-2">
                    • {error}
                  </div>
                ))}
              </div>
            )}

            {lastResult.conflicts > 0 && (
              <div className="mt-3 flex items-start gap-2 text-sm text-orange-700">
                <Warning sx={{ fontSize: 16 }} className="mt-0.5" />
                <span>
                  Some records had conflicts. The most recent version was kept (last write wins).
                </span>
              </div>
            )}
          </div>
        )}

        {/* Device ID */}
        {status && <div className="mt-6 text-xs text-gray-500">Device ID: {status.deviceId}</div>}
      </div>

      {/* Connect Dialog */}
      {showConnectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Connect to Cloud Database</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PostgreSQL Connection URL
              </label>
              <input
                type="text"
                value={cloudUrl}
                onChange={(e) => setCloudUrl(e.target.value)}
                placeholder="postgresql://user:password@host:5432/database"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-2 text-xs text-gray-500">
                Example: postgresql://username:password@your-server.com:5432/petshop_db
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConnect}
                disabled={syncing}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {syncing ? 'Connecting...' : 'Connect'}
              </button>
              <button
                onClick={() => setShowConnectDialog(false)}
                disabled={syncing}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
