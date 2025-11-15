import { Box, Typography } from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'

export type Customer = { id: string; name: string; phone?: string; tier?: string }

export type CustomerSelectorProps = {
  customers: Customer[]
  selectedCustomerId: string | null
  onChange: (customerId: string | null) => void
}

export default function CustomerSelector({
  customers,
  selectedCustomerId,
  onChange
}: CustomerSelectorProps): React.JSX.Element {
  const value = customers.find((c) => c.id === selectedCustomerId) ?? null

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Customer
      </Typography>
      <Autocomplete
        size="small"
        options={customers}
        value={value}
        onChange={(_, newValue) => onChange(newValue ? newValue.id : null)}
        getOptionLabel={(option) => option.name}
        renderInput={(params) => <TextField {...params} placeholder="Walk-in customer" />}
        clearOnEscape
      />
    </Box>
  )
}
