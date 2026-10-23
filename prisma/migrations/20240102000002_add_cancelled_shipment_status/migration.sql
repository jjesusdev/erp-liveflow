-- Migration: Add new enum value 'CANCELLED' to ShipmentStatus
-- Strategy: Only add new enum values, never remove existing ones.
-- This migration can be safely applied to a database that already has
-- the ShipmentStatus enum with existing values.

-- Add CANCELLED value to ShipmentStatus enum
-- We need to use PostgreSQL's ALTER TYPE ... ADD VALUE command

ALTER TYPE "ShipmentStatus" ADD VALUE 'CANCELLED';

-- Update the enum check constraint to include the new value
-- (PostgreSQL automatically updates the enum type)

COMMENT ON TYPE "ShipmentStatus" IS 'Shipment status enum. New values can be added via ALTER TYPE ... ADD VALUE. Existing values are preserved.';