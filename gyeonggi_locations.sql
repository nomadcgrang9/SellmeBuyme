-- Gyeonggi kindergartens and special schools
INSERT INTO geocache (organization, latitude, longitude, source) VALUES
  ('두일유치원', 37.7201155648, 126.7135767911, 'gyeonggi_kindergarten'),
  ('운광초등학교병설유치원', 37.7095710389, 126.7412112326, 'gyeonggi_kindergarten')
ON CONFLICT (organization) DO NOTHING;