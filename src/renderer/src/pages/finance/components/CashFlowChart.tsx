import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useMemo } from 'react'

interface DataPoint {
  date: string
  income: number
  expense: number
}

interface CashFlowChartProps {
  data: DataPoint[]
}

export default function CashFlowChart({ data }: CashFlowChartProps): React.JSX.Element {
  const chartData = useMemo(() => {
    if (data.length === 0) return { points: [], maxValue: 0, labels: [] }

    const maxValue = Math.max(
      ...data.map((d) => Math.max(d.income, d.expense)),
      1 // Prevent division by zero
    )

    const labels = data.map((d) => {
      const date = new Date(d.date)
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    })

    return { points: data, maxValue, labels }
  }, [data])

  if (data.length === 0) {
    return (
      <Box
        sx={{
          height: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          borderRadius: 1
        }}
      >
        <Typography color="text.secondary">Tidak ada data untuk ditampilkan</Typography>
      </Box>
    )
  }

  const chartHeight = 200
  const chartWidth = 100 // percentage
  const barWidth = Math.min(40, (chartWidth / data.length) * 0.4)
  const gap = (chartWidth - barWidth * data.length) / (data.length + 1)

  return (
    <Box sx={{ width: '100%' }}>
      {/* Chart */}
      <Box
        sx={{
          position: 'relative',
          height: chartHeight,
          bgcolor: 'background.default',
          borderRadius: 1,
          p: 2,
          display: 'flex',
          alignItems: 'flex-end',
          gap: `${gap}%`
        }}
      >
        {chartData.points.map((point, index) => {
          const incomeHeight = (point.income / chartData.maxValue) * (chartHeight - 40)
          const expenseHeight = (point.expense / chartData.maxValue) * (chartHeight - 40)

          return (
            <Box
              key={index}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  gap: 0.5,
                  alignItems: 'flex-end',
                  height: chartHeight - 60
                }}
              >
                {/* Income bar */}
                <Box
                  sx={{
                    width: 16,
                    height: Math.max(incomeHeight, 2),
                    bgcolor: 'success.main',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease'
                  }}
                  title={`Pemasukan: Rp ${point.income.toLocaleString('id-ID')}`}
                />
                {/* Expense bar */}
                <Box
                  sx={{
                    width: 16,
                    height: Math.max(expenseHeight, 2),
                    bgcolor: 'error.main',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease'
                  }}
                  title={`Pengeluaran: Rp ${point.expense.toLocaleString('id-ID')}`}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" noWrap>
                {chartData.labels[index]}
              </Typography>
            </Box>
          )
        })}
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, bgcolor: 'success.main', borderRadius: 0.5 }} />
          <Typography variant="caption">Pemasukan</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, bgcolor: 'error.main', borderRadius: 0.5 }} />
          <Typography variant="caption">Pengeluaran</Typography>
        </Box>
      </Box>
    </Box>
  )
}
