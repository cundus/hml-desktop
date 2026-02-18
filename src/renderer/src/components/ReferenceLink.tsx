import React from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Link } from '@mui/material'

interface ReferenceLinkProps {
  reference: string | null
}

const ReferenceLink: React.FC<ReferenceLinkProps> = ({ reference }) => {
  if (!reference) return <span>-</span>

  // Simple parser for reference types and codes
  // Formats expected: 
  // - TRX-20260217-0001 (Sales)
  // - RTN-20260217-0001 (Return)
  // - PO-20260217-0001 (Purchase Order)
  // - ADJ-xxx (Adjustment - No link usually)
  
  const upperRef = reference.toUpperCase()

  if (upperRef.startsWith('TRX-') || upperRef.includes('SALE')) {
    // Extract code if possible
    const code = reference.includes(':') ? reference.split(':')[1] : reference
    return (
      <Link component={RouterLink} to={`/sales?code=${code}`} sx={{ fontWeight: 'medium' }}>
        {reference}
      </Link>
    )
  }

  if (upperRef.startsWith('RTN-') || upperRef.includes('RETUR')) {
    // Assuming retur has a similar search or detail page
    return (
      <Link component={RouterLink} to={`/sales/returns?code=${reference}`} sx={{ fontWeight: 'medium' }}>
        {reference}
      </Link>
    )
  }

  if (upperRef.startsWith('PO-')) {
    return (
      <Link component={RouterLink} to={`/purchasing/po?code=${reference}`} sx={{ fontWeight: 'medium' }}>
        {reference}
      </Link>
    )
  }

  return <span>{reference}</span>
}

export default ReferenceLink
