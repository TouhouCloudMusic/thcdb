INSERT INTO
  language (id, name, code)
VALUES
  (1, 'Cantonese', 'yue'),
  (2, 'Chinese', 'zho'),
  (3, 'English', 'eng'),
  (4, 'Finnish', 'fin'),
  (5, 'French', 'fra'),
  (6, 'German', 'deu'),
  (7, 'Italian', 'ita'),
  (8, 'Japanese', 'jpn'),
  (9, 'Korean', 'kor'),
  (10, 'Latin', 'lat'),
  (11, 'Mandarin', 'cmn'),
  (12, 'Min Nan Chinese', 'nan'),
  (13, 'Polish', 'pol'),
  (14, 'Russian', 'rus'),
  (15, 'Spanish', 'spa'),
  (16, 'Swedish', 'swe'),
  (17, 'Conlang', 'n/a') ON CONFLICT DO NOTHING;
