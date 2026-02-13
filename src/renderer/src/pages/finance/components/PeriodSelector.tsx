import { useMemo, useState, useEffect } from 'react'
import { useDebounce } from '../../../hooks/useDebounce'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import TextField from '@mui/material/TextField'
import Stack from '@mui/material/Stack'

export type PeriodPreset = 'today' | 'week' | 'month' | 'custom'

export interface DateRange {
  start: Date
  end: Date
}

interface PeriodSelectorProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

function getPresetRange(preset: PeriodPreset): DateRange {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (preset) {
    case 'today':
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
      }
    case 'week': {
      const dayOfWeek = today.getDay()
      const monday = new Date(today)
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)
      return { start: monday, end: sunday }
    }
    case 'month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      return { start: firstDay, end: lastDay }
    }
    default:
      return { start: today, end: today }
  }
}

function formatDateForInput(date: Date): string {
  if (isNaN(date.getTime())) return ''
  try {
    return date.toISOString().split('T')[0]
  } catch (e) {
    return ''
  }
}

export default function PeriodSelector({ value, onChange }: PeriodSelectorProps): React.JSX.Element {
  const [internalStart, setInternalStart] = useState(formatDateForInput(value.start))
  const [internalEnd, setInternalEnd] = useState(formatDateForInput(value.end))

  const debouncedStart = useDebounce(internalStart, 1000)
  const debouncedEnd = useDebounce(internalEnd, 1000)

  // Sync internal state with external value when it changes (e.g. from preset buttons)
  useEffect(() => {
    const formatted = formatDateForInput(value.start)
    if (formatted !== internalStart) {
      setInternalStart(formatted)
    }
  }, [value.start])

  useEffect(() => {
    const formatted = formatDateForInput(value.end)
    if (formatted !== internalEnd) {
      setInternalEnd(formatted)
    }
  }, [value.end])

  // Call onChange when debounced values are valid and different
  useEffect(() => {
    const newDate = new Date(debouncedStart)
    if (!isNaN(newDate.getTime()) && formatDateForInput(newDate) !== formatDateForInput(value.start)) {
      let newEnd = value.end
      // If start > end, also move end to same day (end of day)
      if (newDate > value.end) {
        newEnd = new Date(newDate.getTime())
        newEnd.setHours(23, 59, 59, 999)
      }
      onChange({ start: newDate, end: newEnd })
    }
  }, [debouncedStart])

  useEffect(() => {
    const newDate = new Date(debouncedEnd + 'T23:59:59')
    if (!isNaN(newDate.getTime()) && formatDateForInput(newDate) !== formatDateForInput(value.end)) {
      let newStart = value.start
      // If end < start, also move start to same day (start of day)
      if (newDate < value.start) {
        newStart = new Date(newDate.getTime())
        newStart.setHours(0, 0, 0, 0)
      }
      onChange({ start: newStart, end: newDate })
    }
  }, [debouncedEnd])

  const activePreset = useMemo<PeriodPreset>(() => {
    const today = getPresetRange('today')
    const week = getPresetRange('week')
    const month = getPresetRange('month')

    const isSameDay = (d1: Date, d2: Date): boolean => {
      return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
      )
    }

    if (isSameDay(value.start, today.start) && isSameDay(value.end, today.end)) return 'today'
    if (isSameDay(value.start, week.start) && isSameDay(value.end, week.end)) return 'week'
    if (isSameDay(value.start, month.start) && isSameDay(value.end, month.end)) return 'month'

    return 'custom'
  }, [value])

  const handlePresetClick = (preset: PeriodPreset): void => {
    if (preset !== 'custom') {
      onChange(getPresetRange(preset))
    }
  }

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setInternalStart(e.target.value)
  }

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setInternalEnd(e.target.value)
  }

  const periodLabel = useMemo(() => {
    const startStr = value.start.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
    const endStr = value.end.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
    return startStr === endStr ? startStr : `${startStr} - ${endStr}`
  }, [value])

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <ButtonGroup size="small">
          <Button
            variant={activePreset === 'today' ? 'contained' : 'outlined'}
            onClick={() => handlePresetClick('today')}
          >
            Hari Ini
          </Button>
          <Button
            variant={activePreset === 'week' ? 'contained' : 'outlined'}
            onClick={() => handlePresetClick('week')}
          >
            Minggu Ini
          </Button>
          <Button
            variant={activePreset === 'month' ? 'contained' : 'outlined'}
            onClick={() => handlePresetClick('month')}
          >
            Bulan Ini
          </Button>
        </ButtonGroup>

        <TextField
          type="date"
          size="small"
          label="Dari"
          value={internalStart}
          onChange={handleStartChange}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />

        <TextField
          type="date"
          size="small"
          label="Sampai"
          value={internalEnd}
          onChange={handleEndChange}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />

        <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
          Periode: <strong>{periodLabel}</strong>
        </Box>
      </Stack>
    </Box>
  )
}
