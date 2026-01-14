import { useState, useEffect } from 'react'
import { Cloud, CloudOff, Sync, Error as ErrorIcon } from '@mui/icons-material'
import { Badge, Tooltip, IconButton, CircularProgress } from '@mui/material'

interface QueueStats {
  pending: number
  failed: number
  isProcessing: boolean
  isOnline: boolean
}

/**
 * QueueStatusIndicator - Shows online/offline status and pending queue count
 * For use in sidebar or header
 */
export function QueueStatusIndicator(): React.JSX.Element {
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [loading, setLoading] = useState(false)

  // Load stats on mount and periodically
  useEffect(() => {
    void loadStats()
    const interval = setInterval(() => { void loadStats() }, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadStats = async (): Promise<void> => {
    try {
      const response = await window.api.db.queue.getStats()
      if (response.success && response.data) {
        setStats(response.data)
      }
    } catch (error) {
      console.error('[QueueStatus] Failed to load stats:', error)
    }
  }

  const handleProcessNow = async (): Promise<void> => {
    setLoading(true)
    try {
      await window.api.db.queue.processNow()
      await loadStats()
    } catch (error) {
      console.error('[QueueStatus] Failed to process queue:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!stats) return <></>

  const { isOnline, pending, failed, isProcessing } = stats
  
  // Determine status color
  const getStatusColor = (): string => {
    if (!isOnline) return '#9ca3af' // gray
    if (failed > 0) return '#ef4444' // red
    if (pending > 0) return '#f59e0b' // orange
    return '#22c55e' // green
  }

  const getTooltipText = (): string => {
    const parts: string[] = []
    parts.push(isOnline ? '🟢 Online' : '🔴 Offline')
    if (pending > 0) parts.push(`📤 ${pending} pending`)
    if (failed > 0) parts.push(`❌ ${failed} failed`)
    if (isProcessing) parts.push('⏳ Processing...')
    if (pending === 0 && failed === 0 && isOnline) parts.push('✅ All synced')
    return parts.join(' | ')
  }

  const badgeContent = pending + failed

  return (
    <Tooltip title={getTooltipText()} arrow placement="right">
      <IconButton
        onClick={handleProcessNow}
        disabled={!isOnline || loading || isProcessing}
        size="small"
        sx={{
          color: getStatusColor(),
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
        }}
      >
        <Badge
          badgeContent={badgeContent > 0 ? badgeContent : null}
          color={failed > 0 ? 'error' : 'warning'}
          max={99}
        >
          {loading || isProcessing ? (
            <CircularProgress size={20} sx={{ color: 'inherit' }} />
          ) : isOnline ? (
            failed > 0 ? <ErrorIcon fontSize="small" /> :
            pending > 0 ? <Sync fontSize="small" /> : <Cloud fontSize="small" />
          ) : (
            <CloudOff fontSize="small" />
          )}
        </Badge>
      </IconButton>
    </Tooltip>
  )
}

export default QueueStatusIndicator
