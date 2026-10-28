export type EmotionKey =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'fear'
  | 'natural'
  | 'sleepy'
  | 'surprise'
  | 'surprised'
  | 'disgust'
  | 'contempt';

export interface EmotionToken {
  key: EmotionKey;
  label: string;
  colorName: string;
  hex: string;
  rgb: string;
  secondaryHex: string;
  tagline: string;
  frequencyHz: number;
  recommendedBreath: 'coherent' | 'box' | 'relax478';
}

export const EMOTION_TOKENS: Record<EmotionKey, EmotionToken> = {
  happy: {
    key: 'happy',
    label: 'Happy',
    colorName: 'Solar Gold',
    hex: '#F59E0B',
    rgb: '245, 158, 11',
    secondaryHex: '#FDE68A',
    tagline: 'Radiant dopaminergic resonance & elevated affective warmth',
    frequencyHz: 528,
    recommendedBreath: 'coherent',
  },
  sad: {
    key: 'sad',
    label: 'Sad',
    colorName: 'Deep Azure',
    hex: '#38BDF8',
    rgb: '56, 189, 248',
    secondaryHex: '#93C5FD',
    tagline: 'Reflective parasympathetic state & quiet inward processing',
    frequencyHz: 396,
    recommendedBreath: 'coherent',
  },
  angry: {
    key: 'angry',
    label: 'Angry',
    colorName: 'Crimson Pulse',
    hex: '#F43F5E',
    rgb: '244, 63, 94',
    secondaryHex: '#FDA4AF',
    tagline: 'High sympathetic kinetic charge requiring thermal down-regulation',
    frequencyHz: 432,
    recommendedBreath: 'relax478',
  },
  fear: {
    key: 'fear',
    label: 'Fear',
    colorName: 'Electric Violet',
    hex: '#8B5CF6',
    rgb: '139, 92, 246',
    secondaryHex: '#C4B5FD',
    tagline: 'Heightened sensory vigilance & autonomic orienting alert',
    frequencyHz: 417,
    recommendedBreath: 'box',
  },
  natural: {
    key: 'natural',
    label: 'Natural',
    colorName: 'Bioluminescent Cyan',
    hex: '#06B6D4',
    rgb: '6, 182, 212',
    secondaryHex: '#67E8F9',
    tagline: 'Centered homeostatic equilibrium & lucid cognitive baseline',
    frequencyHz: 432,
    recommendedBreath: 'coherent',
  },
  sleepy: {
    key: 'sleepy',
    label: 'Sleepy',
    colorName: 'Soft Lavender',
    hex: '#C084FC',
    rgb: '192, 132, 252',
    secondaryHex: '#E9D5FF',
    tagline: 'Delta-wave circadian drift & restorative neural deceleration',
    frequencyHz: 285,
    recommendedBreath: 'relax478',
  },
  surprise: {
    key: 'surprise',
    label: 'Surprise',
    colorName: 'Luminous Amber',
    hex: '#FB923C',
    rgb: '251, 146, 60',
    secondaryHex: '#FED7AA',
    tagline: 'Acute novelty detection & rapid attentional capture',
    frequencyHz: 639,
    recommendedBreath: 'box',
  },
  surprised: {
    key: 'surprised',
    label: 'Surprise',
    colorName: 'Luminous Amber',
    hex: '#FB923C',
    rgb: '251, 146, 60',
    secondaryHex: '#FED7AA',
    tagline: 'Acute novelty detection & rapid attentional capture',
    frequencyHz: 639,
    recommendedBreath: 'box',
  },
  disgust: {
    key: 'disgust',
    label: 'Disgust',
    colorName: 'Jade Emerald',
    hex: '#10B981',
    rgb: '16, 185, 129',
    secondaryHex: '#6EE7B7',
    tagline: 'Protective boundary filtering & somatic recalibration',
    frequencyHz: 417,
    recommendedBreath: 'box',
  },
  contempt: {
    key: 'contempt',
    label: 'Contempt',
    colorName: 'Titanium Slate',
    hex: '#94A3B8',
    rgb: '148, 163, 184',
    secondaryHex: '#CBD5E1',
    tagline: 'Analytical detachment & guarded evaluative focus',
    frequencyHz: 432,
    recommendedBreath: 'coherent',
  },
};

export const EMOTION_LIST: EmotionToken[] = [
  EMOTION_TOKENS.happy,
  EMOTION_TOKENS.sad,
  EMOTION_TOKENS.angry,
  EMOTION_TOKENS.fear,
  EMOTION_TOKENS.natural,
  EMOTION_TOKENS.sleepy,
  EMOTION_TOKENS.surprise,
  EMOTION_TOKENS.disgust,
  EMOTION_TOKENS.contempt,
];

export interface DetectedFaceBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  conf: number;
  label: string;
}

export interface DetectionResult {
  source: string;
  timestamp: string;
  dominant: EmotionKey;
  confidence: number;
  spectrum: Record<string, number>;
  insight: string;
  valence: number;
  arousal: number;
  has_face?: boolean;
  face_count?: number;
  boxes?: DetectedFaceBox[];
}

export interface SoundscapeTrack {
  id: string;
  title: string;
  artist: string;
  emotion: EmotionKey;
  duration: string;
  youtubeId: string;
  bpm: number;
  description: string;
}

export const CURATED_SOUNDSCAPES: SoundscapeTrack[] = [
  // HAPPY
  {
    id: 'track-happy-1',
    title: 'Happy',
    artist: 'Pharrell Williams',
    emotion: 'happy',
    duration: '03:53',
    youtubeId: 'ZbZSe6N_BXs',
    bpm: 160,
    description: 'Upbeat rhythm reinforces positive affect and boosts natural dopamine.',
  },
  {
    id: 'track-happy-2',
    title: 'Uptown Funk',
    artist: 'Mark Ronson ft. Bruno Mars',
    emotion: 'happy',
    duration: '04:30',
    youtubeId: 'OPf0YbXqDm0',
    bpm: 115,
    description: 'High-energy brass funk that elevates confidence and movement.',
  },
  {
    id: 'track-happy-3',
    title: 'Shake It Off',
    artist: 'Taylor Swift',
    emotion: 'happy',
    duration: '04:02',
    youtubeId: 'nfWlot6h_JM',
    bpm: 160,
    description: 'Empowering cadence to shake off negativity and embrace joy.',
  },
  {
    id: 'track-happy-4',
    title: 'Nachde Ne Saare',
    artist: 'Katrina Kaif / Jasleen Royal',
    emotion: 'happy',
    duration: '03:30',
    youtubeId: '3PgmGq3oPoE',
    bpm: 104,
    description: 'Celebratory Indian festive percussion and joyous syncopation.',
  },
  {
    id: 'track-happy-5',
    title: 'Tum Hi Ho',
    artist: 'Arijit Singh',
    emotion: 'happy',
    duration: '04:22',
    youtubeId: '7wtfhZwyrcc',
    bpm: 94,
    description: 'Soulful celebration of love, appreciation, and emotional warmth.',
  },

  // SAD
  {
    id: 'track-sad-1',
    title: 'Fix You',
    artist: 'Coldplay',
    emotion: 'sad',
    duration: '04:55',
    youtubeId: 'k4V3Mo61fJM',
    bpm: 68,
    description: 'Gentle organ build providing comfort, emotional validation, and healing.',
  },
  {
    id: 'track-sad-2',
    title: 'Channa Mereya',
    artist: 'Arijit Singh',
    emotion: 'sad',
    duration: '04:49',
    youtubeId: '284Ov7ysmfA',
    bpm: 72,
    description: 'Cathartic acoustic ballad facilitating emotional release.',
  },
  {
    id: 'track-sad-3',
    title: 'Someone Like You',
    artist: 'Adele',
    emotion: 'sad',
    duration: '04:45',
    youtubeId: 'hLQl3WQQoQ0',
    bpm: 67,
    description: 'Resonant piano ballad that helps process feelings of separation.',
  },
  {
    id: 'track-sad-4',
    title: 'Photograph',
    artist: 'Ed Sheeran',
    emotion: 'sad',
    duration: '04:19',
    youtubeId: 'nSDgHBxUbVQ',
    bpm: 108,
    description: 'Tender acoustic guitar offering warmth and compassionate hope.',
  },
  {
    id: 'track-sad-5',
    title: 'Lag Ja Gale',
    artist: 'Lata Mangeshkar',
    emotion: 'sad',
    duration: '04:18',
    youtubeId: '0-Ed3qJzqgc',
    bpm: 62,
    description: 'Classic timeless melody providing deep emotional solace.',
  },

  // ANGRY
  {
    id: 'track-angry-1',
    title: 'Numb',
    artist: 'Linkin Park',
    emotion: 'angry',
    duration: '03:07',
    youtubeId: 'kXYiU_JCYtU',
    bpm: 110,
    description: 'High energy channels tension safely and validates frustration.',
  },
  {
    id: 'track-angry-2',
    title: 'Believer',
    artist: 'Imagine Dragons',
    emotion: 'angry',
    duration: '03:24',
    youtubeId: '7wtfhZwyrcc',
    bpm: 125,
    description: 'Percussive rhythmic drive converts tension into resilience.',
  },
  {
    id: 'track-angry-3',
    title: 'Lose Yourself',
    artist: 'Eminem',
    emotion: 'angry',
    duration: '05:26',
    youtubeId: '_Yhyp-_hX2s',
    bpm: 171,
    description: 'Intense motivational cadence transforms anger into focused determination.',
  },
  {
    id: 'track-angry-4',
    title: 'Killing in the Name',
    artist: 'Rage Against The Machine',
    emotion: 'angry',
    duration: '05:14',
    youtubeId: 'bWXazVhlyxQ',
    bpm: 88,
    description: 'Safe physical sonic outlet for intense somatic arousal.',
  },

  // FEAR
  {
    id: 'track-fear-1',
    title: 'Runaway',
    artist: 'AURORA',
    emotion: 'fear',
    duration: '04:08',
    youtubeId: 'd_HlPboLRL8',
    bpm: 118,
    description: 'Airy, spacious vocals reduce perceived threat and foster safety.',
  },
  {
    id: 'track-fear-2',
    title: 'Cold/Mess',
    artist: 'Prateek Kuhad',
    emotion: 'fear',
    duration: '04:42',
    youtubeId: 'On86kqM1bX4',
    bpm: 74,
    description: 'Soothing acoustic tone lowers autonomic arousal and grounds anxiety.',
  },
  {
    id: 'track-fear-3',
    title: 'Everything I Wanted',
    artist: 'Billie Eilish',
    emotion: 'fear',
    duration: '04:05',
    youtubeId: 'EgBJmlPo8Xw',
    bpm: 120,
    description: 'Gentle electronic textures offering reassuring emotional containment.',
  },
  {
    id: 'track-fear-4',
    title: 'Mumbai Theme',
    artist: 'A.R. Rahman',
    emotion: 'fear',
    duration: '05:18',
    youtubeId: 'DkO5G6j1GIs',
    bpm: 60,
    description: 'Expansive flute and orchestral textures that induce calm reassurance.',
  },

  // NATURAL
  {
    id: 'track-natural-1',
    title: 'Nuvole Bianche',
    artist: 'Ludovico Einaudi',
    emotion: 'natural',
    duration: '05:58',
    youtubeId: 'kcihcYEOeic',
    bpm: 66,
    description: 'Calm flowing piano supports contemplation and maintains inner balance.',
  },
  {
    id: 'track-natural-2',
    title: 'On The Nature of Daylight',
    artist: 'Max Richter',
    emotion: 'natural',
    duration: '06:14',
    youtubeId: 'rVN1B-tUpgs',
    bpm: 56,
    description: 'Minimalist orchestral strings supporting serene emotional grounding.',
  },
  {
    id: 'track-natural-3',
    title: 'Near Light',
    artist: 'Ólafur Arnalds',
    emotion: 'natural',
    duration: '03:41',
    youtubeId: '4NRXx6U8ABQ',
    bpm: 72,
    description: 'Delicate neoclassical balance ideal for focused work and clarity.',
  },

  // SLEEPY
  {
    id: 'track-sleepy-1',
    title: 'Weightless (Official Ambient)',
    artist: 'Marconi Union',
    emotion: 'sleepy',
    duration: '08:10',
    youtubeId: 'UfcAVejslrU',
    bpm: 60,
    description: 'Scientifically shown to slow heart rate and lower cortisol for sleep.',
  },
  {
    id: 'track-sleepy-2',
    title: 'An Ending (Ascent)',
    artist: 'Brian Eno',
    emotion: 'sleepy',
    duration: '04:24',
    youtubeId: 'OPf0YbXqDm0',
    bpm: 50,
    description: 'Ethereal ambient drone facilitating gentle transition into sleep.',
  },

  // SURPRISE
  {
    id: 'track-surprise-1',
    title: 'Here It Goes Again',
    artist: 'OK Go',
    emotion: 'surprise',
    duration: '03:00',
    youtubeId: 'dTAAsCNK7RA',
    bpm: 146,
    description: 'Playful novelty complements surprise and encourages curiosity.',
  },
  {
    id: 'track-surprise-2',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    emotion: 'surprise',
    duration: '03:20',
    youtubeId: '4NRXx6U8ABQ',
    bpm: 171,
    description: 'Dynamic synth-pop that celebrates unexpected positive moments.',
  },
  {
    id: 'track-surprise-3',
    title: 'Levitating',
    artist: 'Dua Lipa',
    emotion: 'surprise',
    duration: '03:23',
    youtubeId: 'TUVcZfQe-Kw',
    bpm: 103,
    description: 'Futuristic pop that elevates surprise into pure dance energy.',
  },

  // DISGUST
  {
    id: 'track-disgust-1',
    title: 'Get Lucky',
    artist: 'Daft Punk',
    emotion: 'disgust',
    duration: '04:08',
    youtubeId: '5NV6Rdv1a3I',
    bpm: 116,
    description: 'Clean funk groove resets affective state and brings refreshing energy.',
  },
  {
    id: 'track-disgust-2',
    title: 'Dil Chahta Hai',
    artist: 'Shankar-Ehsaan-Loy',
    emotion: 'disgust',
    duration: '05:11',
    youtubeId: '0-Ed3qJzqgc',
    bpm: 118,
    description: 'Light, refreshing vibe clears aversion and renews lightheartedness.',
  },

  // CONTEMPT
  {
    id: 'track-contempt-1',
    title: 'Firestone',
    artist: 'Kygo ft. Conrad Sewell',
    emotion: 'contempt',
    duration: '03:27',
    youtubeId: '9Sc-ir2UwGU',
    bpm: 114,
    description: 'Melodic tropical house that washes away cynicism with positive warmth.',
  },
  {
    id: 'track-contempt-2',
    title: 'Summer',
    artist: 'Calvin Harris',
    emotion: 'contempt',
    duration: '03:54',
    youtubeId: 'ebXbLfLACGM',
    bpm: 128,
    description: 'Expansive electronic groove that transforms judgment into openness.',
  },
];

export interface ReadingResource {
  id: string;
  title: string;
  category: string;
  readTime: string;
  author: string;
  summary: string;
  url: string;
  targetEmotion: EmotionKey;
}

export const WELLNESS_READINGS: ReadingResource[] = [
  {
    id: 'read-1',
    title: 'The Neurobiology of the Physiological Sigh',
    category: 'Respiratory Neuroscience',
    readTime: '4 min read',
    author: 'Stanford Medicine',
    summary: 'How two rapid inhales followed by an extended exhale offloads CO2 and lowers resting heart rate within 15 seconds.',
    url: 'https://med.stanford.edu/news/all-news/2023/01/cyclic-sighing-stress-reduction.html',
    targetEmotion: 'angry',
  },
  {
    id: 'read-2',
    title: 'Affect Labeling: Naming Emotions to Calm the Amygdala',
    category: 'Cognitive Regulation',
    readTime: '5 min read',
    author: 'UCLA Social Cognitive Neuroscience',
    summary: 'fMRI studies show that putting emotional feelings into words reduces activity in the emotional circuitry of the brain.',
    url: 'https://www.apa.org/topics/emotion',
    targetEmotion: 'fear',
  },
  {
    id: 'read-3',
    title: 'Circadian Adenosine Clearance & Deep Rest Protocols',
    category: 'Sleep Architecture',
    readTime: '6 min read',
    author: 'Center for Human Sleep Science',
    summary: 'Working with 90-minute ultradian alertness cycles and non-sleep deep rest (NSDR) to restore cognitive stamina.',
    url: 'https://www.sleepfoundation.org/stages-of-sleep',
    targetEmotion: 'sleepy',
  },
  {
    id: 'read-4',
    title: 'The Science of Happiness & Gratitude Micro-Practices',
    category: 'Positive Psychology',
    readTime: '4 min read',
    author: 'UC Berkeley Greater Good',
    summary: 'Daily 3-minute gratitude reflections systematically strengthen prefrontal dopamine and serotonin pathways.',
    url: 'https://greatergood.berkeley.edu/topic/happiness',
    targetEmotion: 'happy',
  },
  {
    id: 'read-5',
    title: 'Mindfulness-Based Stress Reduction for Daily Living',
    category: 'Clinical Mindfulness',
    readTime: '5 min read',
    author: 'Dr. Jon Kabat-Zinn Protocols',
    summary: 'Evidence-based body scan and mindful presence exercises to de-escalate emotional reactivity.',
    url: 'https://www.mindful.org/how-to-practice-mindfulness/',
    targetEmotion: 'natural',
  },
];

export interface CrisisHotline {
  id: string;
  name: string;
  region: string;
  contactAction: string;
  phoneOrCode: string;
  availability: string;
  description: string;
  url: string;
}

export const CRISIS_HOTLINES: CrisisHotline[] = [
  {
    id: 'hotline-telemanas',
    name: 'Tele-MANAS (Govt of India)',
    region: 'India (Toll-Free Nationwide)',
    contactAction: 'Call 14416',
    phoneOrCode: '14416',
    availability: '24/7 · Toll-Free · 20+ Languages',
    description: 'National tele-mental health programme providing free psychological counseling and psychiatric care across India.',
    url: 'https://telemanas.mohfw.gov.in',
  },
  {
    id: 'hotline-nimhans',
    name: 'NIMHANS Helpline',
    region: 'India',
    contactAction: 'Call 080-46110007',
    phoneOrCode: '080-46110007',
    availability: '24/7 · Clinical Mental Health',
    description: 'Premier medical institution for mental health and neuroscience providing expert clinical support.',
    url: 'https://www.nimhans.ac.in',
  },
  {
    id: 'hotline-icall',
    name: 'iCALL (TISS Mumbai)',
    region: 'India',
    contactAction: 'Call 022-25521111',
    phoneOrCode: '022-25521111',
    availability: 'Mon–Sat (10:00 AM – 8:00 PM)',
    description: 'Free, professional psychosocial telephone and email counseling service run by Tata Institute of Social Sciences.',
    url: 'https://icallhelpline.org',
  },
  {
    id: 'hotline-vandrevala',
    name: 'Vandrevala Foundation',
    region: 'India & International',
    contactAction: 'Call +91 9999 666 555',
    phoneOrCode: '+91 9999 666 555',
    availability: '24/7 · Free & Confidential',
    description: 'Comprehensive crisis intervention and mental health support by experienced clinical psychologists.',
    url: 'https://www.vandrevalafoundation.com',
  },
  {
    id: 'hotline-988',
    name: '988 Suicide & Crisis Lifeline',
    region: 'United States & Canada',
    contactAction: 'Call or Text 988',
    phoneOrCode: '988',
    availability: '24/7 · Free · Confidential',
    description: 'Immediate compassionate support from trained crisis counselors for emotional distress or panic.',
    url: 'https://988lifeline.org',
  },
  {
    id: 'hotline-intl',
    name: 'Find A Helpline Global',
    region: '130+ Countries Worldwide',
    contactAction: 'Browse Directory',
    phoneOrCode: 'findahelpline.com',
    availability: '24/7 · Global Coverage',
    description: 'Verified free and confidential crisis support centers in your local language worldwide.',
    url: 'https://findahelpline.com',
  },
];
