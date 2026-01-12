-- Add description column to strategies table
ALTER TABLE strategies ADD COLUMN description TEXT DEFAULT '';

-- Add is_public column (default true so all strategies are discoverable)
ALTER TABLE strategies ADD COLUMN is_public INTEGER DEFAULT 1;
