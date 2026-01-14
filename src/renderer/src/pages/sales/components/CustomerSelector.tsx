import type React from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'

export type Customer = { id: string; name: string; phone?: string; tier?: string }

export type CustomerSelectorProps = {
  customers: Customer[]
  selectedCustomerId: string | null
  onChange: (customerId: string | null) => void
  inputRef?: React.Ref<HTMLInputElement>
}

export default function CustomerSelector({
  customers,
  selectedCustomerId,
  onChange,
  inputRef
}: CustomerSelectorProps): React.JSX.Element {
  const value = customers.find((c) => c.id === selectedCustomerId) ?? null

  return (
    <Autocomplete
      size="small"
      options={customers}
      value={value}
      onChange={(_, newValue) => onChange(newValue ? newValue.id : null)}
      getOptionLabel={(option) => option.name}
      renderInput={(params) => (
        <TextField 
          {...params} 
          inputRef={inputRef} 
          label="Pilih Pelanggan"
          placeholder="Pelanggan umum" 
        />
      )}
      clearOnEscape
    />
  )
}
