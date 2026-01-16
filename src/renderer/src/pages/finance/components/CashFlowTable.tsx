import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { useState, useMemo } from 'react'
import { formatCurrency } from '../../../utils/currency'

interface CashFlowItem {
  id: string
  date: Date
  description: string
  type: 'income' | 'expense'
  category: string
  amount: number
  reference?: string
}

interface CashFlowTableProps {
  items: CashFlowItem[]
}

type TabValue = 'all' | 'income' | 'expense'

export default function CashFlowTable({ items }: CashFlowTableProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabValue>('all')

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return items
    return items.filter((item) => item.type === activeTab)
  }, [items, activeTab])

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [filteredItems])

  const totals = useMemo(() => {
    const income = items.filter((i) => i.type === 'income').reduce((sum, i) => sum + i.amount, 0)
    const expense = items.filter((i) => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0)
    return { income, expense, net: income - expense }
  }, [items])

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Paper>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v as TabValue)}
          sx={{ px: 2 }}
        >
          <Tab
            value="all"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Semua
                <Chip size="small" label={items.length} />
              </Box>
            }
          />
          <Tab
            value="income"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Pemasukan
                <Chip
                  size="small"
                  label={items.filter((i) => i.type === 'income').length}
                  color="success"
                />
              </Box>
            }
          />
          <Tab
            value="expense"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Pengeluaran
                <Chip
                  size="small"
                  label={items.filter((i) => i.type === 'expense').length}
                  color="error"
                />
              </Box>
            }
          />
        </Tabs>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Tanggal</TableCell>
            <TableCell>Deskripsi</TableCell>
            <TableCell>Kategori</TableCell>
            <TableCell>Referensi</TableCell>
            <TableCell align="right">Jumlah</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                <Typography variant="body2" color="text.secondary" py={3}>
                  Tidak ada data
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            sortedItems.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Typography variant="body2">{formatDate(item.date)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{item.description}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={item.category}
                    variant="outlined"
                    color={item.type === 'income' ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {item.reference || '-'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    fontWeight={500}
                    color={item.type === 'income' ? 'success.main' : 'error.main'}
                  >
                    {item.type === 'income' ? '+' : '-'}
                    {formatCurrency(item.amount)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Summary Footer */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 4,
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.default'
        }}
        className="no-print"
      >
        <Box>
          <Typography variant="caption" color="text.secondary">
            Total Pemasukan
          </Typography>
          <Typography variant="body1" fontWeight={600} color="success.main">
            +{formatCurrency(totals.income)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Total Pengeluaran
          </Typography>
          <Typography variant="body1" fontWeight={600} color="error.main">
            -{formatCurrency(totals.expense)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Saldo Bersih
          </Typography>
          <Typography
            variant="body1"
            fontWeight={600}
            color={totals.net >= 0 ? 'success.main' : 'error.main'}
          >
            {totals.net >= 0 ? '+' : ''}
            {formatCurrency(totals.net)}
          </Typography>
        </Box>
      </Box>
    </Paper>
  )
}
