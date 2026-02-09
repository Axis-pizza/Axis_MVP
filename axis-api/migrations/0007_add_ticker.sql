-- Add ticker column to strategies table
ALTER TABLE strategies ADD COLUMN ticker TEXT DEFAULT '';
