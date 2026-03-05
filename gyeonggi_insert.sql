-- Gyeonggi public kindergartens and special schools
INSERT INTO geocache (organization, latitude, longitude, source) VALUES
  ('두일유치원', 37.7201155648, 126.7135767911, 'gg_kinder_public'),
  ('운광초등학교병설유치원', 37.7095710389, 126.7412112326, 'gg_kinder_public'),
  ('해원학교', 37.0903217, 126.8365347, 'gg_special'),
  ('한우리학교', 37.1808101, 126.9620195, 'gg_special'),
  ('명현학교', 37.6567581, 126.8842781, 'gg_special'),
  ('한국경진학교', 37.6653381, 126.7821168, 'gg_special'),
  ('에바다학교', 37.1127218, 127.0664462, 'gg_special')
ON CONFLICT (organization) DO NOTHING;