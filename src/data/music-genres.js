/**
 * 100+ music genres / tags for NewRadio (legacy list).
 * Stations come from the free Radio Browser directory (30k+ public stations).
 */

const MUSIC_GENRES = [
  // Core
  'pop', 'rock', 'hip hop', 'rap', 'r&b', 'soul', 'funk', 'jazz', 'blues', 'classical',
  'electronic', 'dance', 'house', 'techno', 'trance', 'dubstep', 'drum and bass', 'edm',
  'ambient', 'chillout', 'lounge', 'lofi', 'indie', 'alternative', 'metal', 'punk',
  'country', 'folk', 'bluegrass', 'gospel', 'christian', 'reggae', 'ska', 'latin',
  'salsa', 'bachata', 'reggaeton', 'cumbia', 'tango', 'flamenco', 'bossa nova',
  'k-pop', 'j-pop', 'j-rock', 'anime', 'bollywood', 'afrobeats', 'highlife', 'soukous',
  // Expanded
  'soft rock', 'hard rock', 'progressive rock', 'psychedelic', 'grunge', 'emo',
  'metalcore', 'death metal', 'black metal', 'thrash', 'nu metal', 'industrial',
  'synthwave', 'vaporwave', 'disco', 'garage', 'deep house', 'tech house',
  'minimal', 'hardstyle', 'hardcore', 'gabber', 'break', 'eurodance',
  'trip hop', 'downtempo', 'new age', 'meditation', 'sleep', 'study',
  'opera', 'orchestral', 'piano', 'soundtrack', 'musical', 'showtunes',
  'swing', 'big band', 'bebop', 'smooth jazz', 'acid jazz', 'fusion',
  'delta blues', 'chicago blues', 'rhythm and blues', 'motown', 'neo soul',
  'trap', 'drill', 'grime', 'uk garage', 'dub', 'dancehall', 'soca',
  'samba', 'mpb', 'forro', 'sertanejo', 'pagode', 'mariachi', 'norteño',
  'tejano', 'banda', 'vallenato', 'merengue', 'rumba',
  'arabic', 'turkish', 'persian', 'hindustani', 'carnatic', 'qawwali',
  'chinese', 'cantopop', 'mandopop', 'thai', 'vietnamese', 'indonesian',
  'afrobeat', 'amapiano', 'kwaito', 'rai', 'gnawa', 'mbalax',
  'celtic', 'irish', 'scottish', 'polka', 'schlager', 'chanson',
  'french pop', 'deutschrap', 'italo disco', 'eurovision',
  'christmas', 'holiday', 'kids', 'nursery', 'audiobook', 'talk',
  'news', 'sports talk', 'comedy', 'podcast', 'oldies', '80s', '90s', '00s', '70s', '60s',
  'top 40', 'hits', 'charts', 'love songs', 'ballads', 'acoustic', 'instrumental',
  'world', 'ethnic', 'traditional', 'polka', 'zydeco', 'cajun',
];

/** Unique sorted genre list */
const GENRE_LIST = [...new Set(MUSIC_GENRES.map((g) => g.toLowerCase()))].sort();

module.exports = { MUSIC_GENRES, GENRE_LIST };
