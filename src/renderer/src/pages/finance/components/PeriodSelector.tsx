import { useState, useMemo } from 'react'
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
  return date.toISOString().split('T')[0]
}

export default function PeriodSelector({ value, onChange }: PeriodSelectorProps): React.JSX.Element {
  const [activePreset, setActivePreset] = useState<PeriodPreset>('today')

  const handlePresetClick = (preset: PeriodPreset): void => {
    setActivePreset(preset)
    if (preset !== 'custom') {
      onChange(getPresetRange(preset))
    }
  }

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setActivePreset('custom')
    onChange({
      ...value,
      start: new Date(e.target.value)
    })
  }

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setActivePreset('custom')
    onChange({
      ...value,
      end: new Date(e.target.value + 'T23:59:59')
    })
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
          value={formatDateForInput(value.start)}
          onChange={handleStartChange}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />

        <TextField
          type="date"
          size="small"
          label="Sampai"
          value={formatDateForInput(value.end)}
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
