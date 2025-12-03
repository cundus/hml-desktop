import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { alpha, styled } from '@mui/material/styles'

const KbdKey = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '24px',
  height: '24px',
  padding: theme.spacing(0, 1),
  margin: theme.spacing(0, 0.25),
  backgroundColor: alpha(theme.palette.grey[500], 0.1),
  border: `1px solid ${alpha(theme.palette.grey[500], 0.3)}`,
  borderRadius: theme.shape.borderRadius,
  fontFamily: 'monospace',
  fontSize: '0.75rem',
  fontWeight: 500,
  color: theme.palette.text.secondary,
  boxShadow: `0 1px 2px ${alpha('#000', 0.1)}`,
  '&:hover': {
    backgroundColor: alpha(theme.palette.grey[500], 0.15),
    borderColor: alpha(theme.palette.grey[500], 0.4)
  }
}))

const KbdContainer = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  flexWrap: 'wrap'
}))

export interface KbdProps {
  /**
   * Array of keys to display
   * Examples: ['F1'], ['Alt', '1'], ['↑'], ['Enter']
   */
  keys: string[]
  /**
   * Optional description to show after the keys
   */
  description?: string
  /**
   * Size variant
   */
  size?: 'small' | 'medium'
}

export default function Kbd({ keys, description, size = 'medium' }: KbdProps): React.JSX.Element {
  const height = size === 'small' ? '20px' : '24px'
  const fontSize = size === 'small' ? '0.7rem' : '0.75rem'
  const padding = size === 'small' ? '0 4px' : '0 6px'

  return (
    <KbdContainer>
      {keys.map((key, index) => (
        <KbdKey
          key={index}
          sx={{
            height,
            fontSize,
            padding,
            minWidth: key.length > 1 ? 'auto' : height
          }}
        >
          {key}
        </KbdKey>
      ))}
      {description && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ ml: 0.5 }}
        >
          {description}
        </Typography>
      )}
    </KbdContainer>
  )
}

/**
 * Pre-configured Kbd components for common shortcuts
 */
export const KbdShortcuts = {
  Enter: () => <Kbd keys={['Enter']} />,
  Escape: () => <Kbd keys={['Esc']} />,
  ArrowUp: () => <Kbd keys={['↑']} />,
  ArrowDown: () => <Kbd keys={['↓']} />,
  Tab: () => <Kbd keys={['Tab']} />,
  ShiftTab: () => <Kbd keys={['Shift', 'Tab']} />,
  F1: () => <Kbd keys={['F1']} />,
  F2: () => <Kbd keys={['F2']} />,
  Alt1: () => <Kbd keys={['Alt', '1']} />,
  Alt2: () => <Kbd keys={['Alt', '2']} />,
  Alt3: () => <Kbd keys={['Alt', '3']} />
} as const
