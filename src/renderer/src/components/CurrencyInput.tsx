import type React from 'react'
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import TextField, { type TextFieldProps } from '@mui/material/TextField'

export type CurrencyInputProps = Omit<TextFieldProps, 'value' | 'onChange' | 'type'> & {
  value: number
  onChange: (value: number) => void
}

export interface CurrencyInputRef {
  focus: () => void
  select: () => void
  inputElement: HTMLInputElement | null
}

const CurrencyInput = forwardRef<CurrencyInputRef, CurrencyInputProps>(
  ({ value, onChange, ...textFieldProps }, ref): React.JSX.Element => {
    const [displayValue, setDisplayValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)
    const lastValidValue = useRef<number>(value)

    useImperativeHandle(
      ref,
      () => ({
        focus: () => inputRef.current?.focus(),
        select: () => inputRef.current?.select(),
        inputElement: inputRef.current
      }),
      []
    )

    // Format number as Indonesian Rupiah (no decimals, dot separators)
    const formatToIDR = (num: number): string => {
      if (isNaN(num) || num < 0) return ''
      return num.toLocaleString('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })
    }

    // Parse input string to number (remove non-digits, convert to number)
    const parseFromIDR = (str: string): number => {
      const clean = str.replace(/[^\d]/g, '')
      if (clean === '') return 0
      return parseInt(clean, 10)
    }

    // Update display when value changes from outside
    useEffect(() => {
      setDisplayValue(formatToIDR(value))
      lastValidValue.current = value
    }, [value])

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
      const newValue = event.target.value
      setDisplayValue(newValue)

      const parsed = parseFromIDR(newValue)
      if (!isNaN(parsed)) {
        lastValidValue.current = parsed
        onChange(parsed)
      }
    }

    const handleBlur = (): void => {
      // Format the display value when input loses focus
      const formatted = formatToIDR(lastValidValue.current)
      setDisplayValue(formatted)
    }

    const handleFocus = (): void => {
      // Select all text when focused for easy editing
      inputRef.current?.select()
    }

    return (
      <TextField
        {...textFieldProps}
        inputRef={inputRef}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        inputProps={{
          ...textFieldProps.inputProps,
          style: { textAlign: 'right', ...textFieldProps.inputProps?.style }
        }}
        placeholder="0"
      />
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'

export default CurrencyInput
