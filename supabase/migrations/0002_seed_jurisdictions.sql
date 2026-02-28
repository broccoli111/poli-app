-- Seed jurisdictions table with federal + all 50 states + DC
-- This is required for bills and politicians to appear in the app

-- Federal jurisdiction
INSERT INTO jurisdictions (level, name, state_code) VALUES
  ('federal', 'United States Federal', NULL)
ON CONFLICT DO NOTHING;

-- State jurisdictions
INSERT INTO jurisdictions (level, name, state_code) VALUES
  ('state', 'Alabama', 'AL'),
  ('state', 'Alaska', 'AK'),
  ('state', 'Arizona', 'AZ'),
  ('state', 'Arkansas', 'AR'),
  ('state', 'California', 'CA'),
  ('state', 'Colorado', 'CO'),
  ('state', 'Connecticut', 'CT'),
  ('state', 'Delaware', 'DE'),
  ('state', 'Florida', 'FL'),
  ('state', 'Georgia', 'GA'),
  ('state', 'Hawaii', 'HI'),
  ('state', 'Idaho', 'ID'),
  ('state', 'Illinois', 'IL'),
  ('state', 'Indiana', 'IN'),
  ('state', 'Iowa', 'IA'),
  ('state', 'Kansas', 'KS'),
  ('state', 'Kentucky', 'KY'),
  ('state', 'Louisiana', 'LA'),
  ('state', 'Maine', 'ME'),
  ('state', 'Maryland', 'MD'),
  ('state', 'Massachusetts', 'MA'),
  ('state', 'Michigan', 'MI'),
  ('state', 'Minnesota', 'MN'),
  ('state', 'Mississippi', 'MS'),
  ('state', 'Missouri', 'MO'),
  ('state', 'Montana', 'MT'),
  ('state', 'Nebraska', 'NE'),
  ('state', 'Nevada', 'NV'),
  ('state', 'New Hampshire', 'NH'),
  ('state', 'New Jersey', 'NJ'),
  ('state', 'New Mexico', 'NM'),
  ('state', 'New York', 'NY'),
  ('state', 'North Carolina', 'NC'),
  ('state', 'North Dakota', 'ND'),
  ('state', 'Ohio', 'OH'),
  ('state', 'Oklahoma', 'OK'),
  ('state', 'Oregon', 'OR'),
  ('state', 'Pennsylvania', 'PA'),
  ('state', 'Rhode Island', 'RI'),
  ('state', 'South Carolina', 'SC'),
  ('state', 'South Dakota', 'SD'),
  ('state', 'Tennessee', 'TN'),
  ('state', 'Texas', 'TX'),
  ('state', 'Utah', 'UT'),
  ('state', 'Vermont', 'VT'),
  ('state', 'Virginia', 'VA'),
  ('state', 'Washington', 'WA'),
  ('state', 'West Virginia', 'WV'),
  ('state', 'Wisconsin', 'WI'),
  ('state', 'Wyoming', 'WY'),
  ('state', 'District of Columbia', 'DC')
ON CONFLICT DO NOTHING;
