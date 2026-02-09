import { Autocomplete, CircularProgress, TextField, Typography, Box } from '@mui/material'
import { useState, useEffect, useMemo, useRef } from 'react'
import { debounce } from 'lodash'

export interface Product {
  id: string
  name: string
  sku: string
  cost: string
  unit: string
}

interface AsyncProductSelectProps {
  value: Product | null
  onChange: (value: Product | null) => void
  label?: string
  required?: boolean
  error?: boolean
  helperText?: string
  sx?: any
  disabled?: boolean
}

export default function AsyncProductSelect({
  value,
  onChange,
  label = 'Pilih Produk',
  required = false,
  error = false,
  helperText,
  sx,
  disabled = false
}: AsyncProductSelectProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')

  // Keep track if component is mounted to avoid state updates on unmount
  const active = useRef(true)

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])

  // Debounced search function
  const searchProducts = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query || query.length < 2) {
          setOptions([])
          setLoading(false)
          return
        }

        try {
          const response = await window.api.db.products.search(query)
          if (active.current && response.success) {
            setOptions(response.data || [])
          }
        } catch (error) {
          console.error('Error searching products:', error)
          if (active.current) {
            setOptions([])
          }
        } finally {
          if (active.current) {
            setLoading(false)
          }
        }
      }, 500),
    []
  )

  useEffect(() => {
    if (!open) {
      setOptions([])
      return
    }

    if (inputValue === '' && !value) {
        // Optional: Load initial suggestions or perform empty search if API supports it
        // For now, require input
        setOptions([]) 
    }
  }, [open, inputValue, value])

  const handleInputChange = (_event: React.SyntheticEvent, newInputValue: string): void => {
    setInputValue(newInputValue)
    
    if (newInputValue.length >= 2) {
      setLoading(true)
      searchProducts(newInputValue)
    } else {
      setOptions([])
      setLoading(false)
    }
  }

  return (
    <Autocomplete
      id="async-product-select"
      sx={sx}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      getOptionLabel={(option) => `${option.sku} - ${option.name}`}
      options={options}
      loading={loading}
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      onInputChange={handleInputChange}
      disabled={disabled}
      filterOptions={(x) => x} // Disable built-in filtering to rely on server-side search
      noOptionsText={inputValue.length < 2 ? "Ketik minimal 2 karakter untuk mencari..." : "Tidak ada produk ditemukan"}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            )
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Box>
            <Typography variant="body2">{option.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {option.sku}
            </Typography>
          </Box>
        </li>
      )}
    />
  )
}
