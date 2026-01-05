-- Add todos JSONB column to dev_ideas table
-- This enables inline Todo checklist for ideas (replacing complex project management)

ALTER TABLE dev_ideas
ADD COLUMN IF NOT EXISTS todos JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN dev_ideas.todos IS 'Array of todo items: [{id, content, is_completed, completed_at}]';

-- Create index for better query performance on todos
CREATE INDEX IF NOT EXISTS idx_dev_ideas_todos ON dev_ideas USING GIN (todos);
