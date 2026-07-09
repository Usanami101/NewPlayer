/**
 * NewRadio filter catalogs — genre, religion, country, language, mood.
 * Stations resolved via Radio Browser API tags / country codes.
 */

const GENRES = [
  'pop', 'rock', 'hip hop', 'rap', 'r&b', 'soul', 'funk', 'jazz', 'blues', 'classical',
  'electronic', 'dance', 'house', 'techno', 'trance', 'dubstep', 'drum and bass', 'edm',
  'ambient', 'chillout', 'lounge', 'lofi', 'indie', 'alternative', 'metal', 'punk',
  'country', 'folk', 'bluegrass', 'reggae', 'ska', 'latin', 'salsa', 'bachata',
  'reggaeton', 'cumbia', 'tango', 'flamenco', 'bossa nova', 'k-pop', 'j-pop', 'anime',
  'bollywood', 'afrobeats', 'soft rock', 'hard rock', 'progressive rock', 'grunge',
  'synthwave', 'disco', 'deep house', 'hardstyle', 'trip hop', 'new age', 'opera',
  'smooth jazz', 'trap', 'dancehall', 'samba', 'mariachi', 'schlager', 'chanson',
  'oldies', '80s', '90s', '00s', '70s', '60s', 'top 40', 'hits', 'acoustic',
  'instrumental', 'world', 'talk', 'news', 'sports', 'comedy',
].sort();

/** Faith / spiritual radio tags used on Radio Browser */
const RELIGIONS = [
  { id: 'christian', label: 'Christian', tags: ['christian', 'christianity'] },
  { id: 'gospel', label: 'Gospel', tags: ['gospel'] },
  { id: 'catholic', label: 'Catholic', tags: ['catholic'] },
  { id: 'protestant', label: 'Protestant', tags: ['protestant'] },
  { id: 'orthodox', label: 'Orthodox', tags: ['orthodox'] },
  { id: 'islamic', label: 'Islamic', tags: ['islam', 'islamic', 'muslim', 'quran'] },
  { id: 'jewish', label: 'Jewish', tags: ['jewish', 'judaism', 'hebrew'] },
  { id: 'hindu', label: 'Hindu', tags: ['hindu', 'hinduism', 'bhajan'] },
  { id: 'buddhist', label: 'Buddhist', tags: ['buddhist', 'buddhism'] },
  { id: 'sikh', label: 'Sikh', tags: ['sikh', 'sikhism'] },
  { id: 'spiritual', label: 'Spiritual', tags: ['spiritual', 'meditation', 'new age'] },
  { id: 'worship', label: 'Worship', tags: ['worship', 'praise'] },
  { id: 'religious', label: 'Religious (general)', tags: ['religious', 'religion', 'faith'] },
];

/** ISO country codes for dial / filter chips */
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czechia' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
  { code: 'GR', name: 'Greece' },
  { code: 'TR', name: 'Turkey' },
  { code: 'RU', name: 'Russia' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'TH', name: 'Thailand' },
  { code: 'PH', name: 'Philippines' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'AE', name: 'UAE' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'EG', name: 'Egypt' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'IL', name: 'Israel' },
];

const LANGUAGES = [
  'english', 'spanish', 'french', 'german', 'portuguese', 'italian', 'dutch',
  'russian', 'arabic', 'hindi', 'chinese', 'japanese', 'korean', 'turkish',
  'polish', 'swedish', 'norwegian', 'danish', 'finnish', 'greek', 'hebrew',
  'indonesian', 'thai', 'vietnamese', 'swahili', 'ukrainian',
];

const MOODS = [
  'hits', 'love', 'dance', 'chill', 'party', 'relax', 'sleep', 'work',
  'study', 'road', 'classic', 'live', 'local',
];

module.exports = {
  GENRES,
  RELIGIONS,
  COUNTRIES,
  LANGUAGES,
  MOODS,
};
