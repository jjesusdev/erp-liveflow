-- Migration: Add new enum value 'ARCHIVED' to ConversationStatus
-- Strategy: Only add new enum values, never remove existing ones.

ALTER TYPE "ConversationStatus" ADD VALUE 'ARCHIVED';

COMMENT ON TYPE "ConversationStatus" IS 'Conversation status enum. New values can be added via ALTER TYPE ... ADD VALUE. Existing values are preserved.';