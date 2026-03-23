import { VOCAB_DATA } from '../vocab-data';

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
  // Learning science
  "Memory is the residue of thought. The more you THINK about a word, the stronger the trace.",
  "Retrieval is re-encoding: struggling to remember actually makes the memory stronger.",
  "Don't just translate\u2014visualize! German word \u2192 image directly builds a German schema.",
  "Split your study into 2-3 short sessions instead of one long block for better retention.",
  "Writing a personal sentence with each word creates context-dependent memory.",
  "The moment of struggle when recalling is EXACTLY when learning happens. Embrace it!",
  "Interleaving (mixing word types) feels harder but produces stronger long-term retention.",
  "Sleep consolidates memory. Study before bed, and your brain rehearses while you sleep.",
  "Spacing effect: reviewing a word after 3 days beats reviewing it 3 times in one day.",
  "Your brain strengthens neural pathways each time you successfully recall a word.",
  "Mistakes are not failures\u2014they're data. Each error shows your brain what to focus on.",
  "The forgetting curve is steepest in the first 24 hours. That first review matters most.",
  "Dual coding: pairing a word with both an image and a sound creates two memory pathways.",
  "Testing yourself is 50% more effective than re-reading. Flashcards beat highlighting.",
  "Context matters: learning a word in a sentence is 3x more memorable than learning it alone.",
  // Motivation
  "\u201CThe limits of my language mean the limits of my world.\u201D \u2014 Ludwig Wittgenstein",
  "\u201COne language sets you in a corridor for life. Two languages open every door along the way.\u201D \u2014 Frank Smith",
  "\u201CTo have another language is to possess a second soul.\u201D \u2014 Charlemagne",
  "\u201CLanguage is the road map of a culture.\u201D \u2014 Rita Mae Brown",
  "\u201CYou can never understand one language until you understand at least two.\u201D \u2014 Geoffrey Willans",
  "\u201CThe beautiful thing about learning is that nobody can take it away from you.\u201D \u2014 B.B. King",
  "\u201CEvery expert was once a beginner.\u201D \u2014 Helen Hayes",
  "\u201CIt does not matter how slowly you go as long as you do not stop.\u201D \u2014 Confucius",
  "\u201CSuccess is the sum of small efforts, repeated day in and day out.\u201D \u2014 Robert Collier",
  "\u201CA different language is a different vision of life.\u201D \u2014 Federico Fellini",
  "\u201CThe secret of getting ahead is getting started.\u201D \u2014 Mark Twain",
  "\u201CKnowing another language is like having a second pair of eyes.\u201D \u2014 Albanian proverb",
  // German-specific
  "Fun fact: German has ~5.3 million words\u2014the most of any European language!",
  "German and English share 60% of their vocabulary. You already know more than you think!",
  "Compound words are German's superpower: Handschuh (hand + shoe) = glove. Logic!",
  "In German, all nouns are capitalized. Once you know this rule, reading gets easier.",
  "The German \u00DF (Eszett) is unique to German\u2014no other language uses it!",
  "Learning der/die/das? Associate each gender with a color: blue/red/green. Visual memory!",
  "German word order is predictable: the verb always comes second in main clauses.",
  "Pro tip: German pronunciation is very consistent. Once you learn the rules, you can read anything."
];

export const MEMORY_STAGES = [
  {level: 1, name: 'New',        desc: 'Just learned, review in 1 day',        color: '#E74C3C', bg: '#fef2f2', interval: 1},
  {level: 2, name: 'Familiar',   desc: 'Recognized, review in 3 days',         color: '#D67635', bg: '#fff7ed', interval: 3},
  {level: 3, name: 'Practicing', desc: 'Getting stronger, review in 7 days',   color: '#E9B746', bg: '#fefce8', interval: 7},
  {level: 4, name: 'Strong',     desc: 'Solid recall, review in 14 days',      color: '#7E9470', bg: '#f0fdf4', interval: 14},
  {level: 5, name: 'Mastered',   desc: 'Fully retained, final review in 30 days', color: '#324A84', bg: '#eff6ff', interval: 30}
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
