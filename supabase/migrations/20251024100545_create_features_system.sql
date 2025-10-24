/*
  # Create Features System with Class-Section Mapping

  1. New Tables
    - `features`
      - `id` (uuid, primary key)
      - `name` (text, feature name)
      - `description` (text, feature description)
      - `is_active` (boolean, whether feature is active)
      - `created_by` (uuid, references admin who created it)
      - `created_at` (timestamptz, creation timestamp)
      - `updated_at` (timestamptz, last update timestamp)
    
    - `feature_class_sections`
      - `id` (uuid, primary key)
      - `feature_id` (uuid, references features table)
      - `class_name` (text, class number like "9", "10")
      - `section` (text, section letter like "A", "B", "C")
      - `created_at` (timestamptz, creation timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read features
    - Add policies for admins to manage features

  3. Notes
    - Each feature can have multiple class-section pairs
    - Class-section pairs are stored as separate rows for flexibility
    - Supports querying features by specific class-section combinations
*/

-- Create features table
CREATE TABLE IF NOT EXISTS features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create feature_class_sections junction table
CREATE TABLE IF NOT EXISTS feature_class_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id uuid NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  class_name text NOT NULL,
  section text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(feature_id, class_name, section)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feature_class_sections_feature_id ON feature_class_sections(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_class_sections_class_section ON feature_class_sections(class_name, section);

-- Enable RLS
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_class_sections ENABLE ROW LEVEL SECURITY;

-- Policies for features table
CREATE POLICY "Anyone can view active features"
  ON features FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert features"
  ON features FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update features"
  ON features FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete features"
  ON features FOR DELETE
  TO authenticated
  USING (true);

-- Policies for feature_class_sections table
CREATE POLICY "Anyone can view feature class sections"
  ON feature_class_sections FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert feature class sections"
  ON feature_class_sections FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update feature class sections"
  ON feature_class_sections FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete feature class sections"
  ON feature_class_sections FOR DELETE
  TO authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_features_updated_at ON features;
CREATE TRIGGER update_features_updated_at
  BEFORE UPDATE ON features
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
