-- Migration: Add cost and cost_override columns to product_uom table
-- For Cost per UOM feature (Option 3: Hybrid)

-- Add cost column (nullable, for manual cost override)
ALTER TABLE product_uom ADD COLUMN IF NOT EXISTS cost NUMERIC;

-- Add cost_override column (default false = auto-calculate)
ALTER TABLE product_uom ADD COLUMN IF NOT EXISTS cost_override BOOLEAN NOT NULL DEFAULT FALSE;

-- Done!
