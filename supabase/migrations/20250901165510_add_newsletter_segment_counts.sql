-- Create table for caching newsletter segment counts
CREATE TABLE IF NOT EXISTS newsletter_segment_counts (
  segment_key TEXT PRIMARY KEY,
  segment_name TEXT NOT NULL,
  description TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_newsletter_segment_counts_updated_at 
  ON newsletter_segment_counts(updated_at);

-- Insert initial data with Portuguese descriptions
INSERT INTO newsletter_segment_counts (segment_key, segment_name, description, count) VALUES
  ('all', 'Todos os inscritos', 'Todos que permitiram receber emails de marketing', 0),
  ('veterans', 'Veteranos', 'Já participou de algum evento', 0),
  ('newbies', 'Novatos', 'Nunca participou de um evento', 0),
  ('new_registrations_30d', 'Novos cadastros', 'Cadastrados nos últimos 30 dias', 0),
  ('applied_never_attended', 'Novatos (nunca participou)', 'Se inscreveu mas nunca participou', 0)
ON CONFLICT (segment_key) DO NOTHING;

-- Add RLS policies for newsletter_segment_counts
ALTER TABLE newsletter_segment_counts ENABLE ROW LEVEL SECURITY;

-- Allow public read access (cached data is not sensitive)
CREATE POLICY "Allow public read access to segment counts"
  ON newsletter_segment_counts
  FOR SELECT
  TO public
  USING (true);

-- Only service role can update counts (will be done by cron job)
CREATE POLICY "Only service role can update segment counts"
  ON newsletter_segment_counts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);