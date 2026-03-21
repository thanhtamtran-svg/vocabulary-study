import { VOCAB_DATA } from '../vocab-data.js';

export const TYPE_TAGS = ["tag-noun","tag-verb","tag-adj","tag-gram","tag-expr","tag-found"];
export const TYPE_NAMES = VOCAB_DATA.types;
export const REVIEW_LABELS = {2:"Review +2",3:"Review +3",5:"Review +5",7:"Review +7"};
export const REVIEW_METHODS = {
  2:"Flashcard Quiz: See German \u2192 produce English + article",
  3:"Context Quiz: Fill in the blank in a sentence",
  5:"Free Recall: Write all 8 words from memory without cues",
  7:"Teach-Back: Explain each word aloud as if teaching"
};
export const DUAL_CODING_TIPS = [
  "Draw a quick sketch of this word's meaning",
  "Picture a specific personal memory connected to this word",
  "Imagine a vivid, absurd scene involving this concept",
  "Connect this word to a place you know well",
  "Think of a person in your life this word reminds you of",
  "Visualize the color, shape, and texture of this concept",
  "Create a mental movie scene featuring this word",
  "Link this to a song, smell, or feeling you know"
];
export const SCIENCE_TIPS = [
  "Memory is the residue of thought. The more you THINK about a word, the stronger the trace.",
  "Retrieval is re-encoding: struggling to remember actually makes the memory stronger.",
  "Don't just translate\u2014visualize! German word \u2192 image directly builds a German schema.",
  "Split your study into 2-3 short sessions instead of one long block for better retention.",
  "Writing a personal sentence with each word creates context-dependent memory.",
  "The moment of struggle when recalling is EXACTLY when learning happens. Embrace it!",
  "Interleaving (mixing word types) feels harder but produces stronger long-term retention."
];

export const MEMORY_STAGES = [
  {level: 1, name: 'New',        desc: 'Just learned, needs frequent review', color: '#E74C3C', bg: '#fef2f2'},
  {level: 2, name: 'Familiar',   desc: 'Recognized, review every 2 days',     color: '#D67635', bg: '#fff7ed'},
  {level: 3, name: 'Practicing', desc: 'Getting stronger, review every 5 days', color: '#E9B746', bg: '#fefce8'},
  {level: 4, name: 'Strong',     desc: 'Solid recall, review every 7 days',   color: '#7E9470', bg: '#f0fdf4'},
  {level: 5, name: 'Mastered',   desc: 'Fully retained, no review needed',    color: '#324A84', bg: '#eff6ff'}
];

export const PRONOUNS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];
export const PRONOUN_KEYS = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];

export const SENTENCE_TEMPLATES = {
  0: ["Ich sehe ___ jeden Tag.", "Das ist ___ .", "Wo ist ___ ?", "Ich brauche ___ .", "Hast du ___ ?"],
  1: ["Ich ___ jeden Tag.", "Wir ___ zusammen.", "Er ___ gern.", "Sie ___ oft."],
  2: ["Das ist sehr ___ .", "Der Mann ist ___ .", "Ich finde das ___ ."],
  3: ["Ich sage ___ .", "___ ist richtig.", "Wir benutzen ___ oft."],
  4: ["Man sagt ___ .", "Auf Deutsch sagen wir ___ ."],
  5: ["___ ist wichtig.", "Das ist ___ .", "Ich kenne ___ ."]
};

export const STORAGE_KEY = 'german1500';
export const SYNC_EMAIL_KEY = 'german1500_sync_email';
export const VAPID_PUBLIC_KEY = 'BK4ScZTP21q8ppg_bEmkoGzZyH2X9IKDuenJ2p9MPm84tOrX0_EAEmrBwMbbNyuBctwWeZPojMJzptw25mHBNAU';
