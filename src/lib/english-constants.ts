export const ENGLISH_TYPE_TAGS = [
  "tag-noun", "tag-verb", "tag-adj", "tag-gram", "tag-expr", "tag-found",
  "tag-idiom", "tag-phrase", "tag-adv", "tag-prep"
];
export const ENGLISH_TYPE_NAMES = [
  "Noun", "Verb", "Adjective", "Noun Phrase", "Verb Phrase", "Adjective Phrase",
  "Adverb", "Idiom", "Prepositional Phrase", "Phrasal Verb"
];

export const ENGLISH_REVIEW_LABELS = {2:"Review +2",3:"Review +3",5:"Review +5",7:"Review +7"};
export const ENGLISH_REVIEW_METHODS = {
  2: "Flashcard Quiz: See definition \u2192 recall the phrase",
  3: "Context Quiz: Fill in the blank in an IELTS-style sentence",
  5: "Free Recall: Write all 8 phrases from memory without cues",
  7: "Teach-Back: Use each phrase in a spoken sentence aloud"
};

export const ENGLISH_DUAL_CODING_TIPS = [
  "Picture yourself using this phrase in an IELTS Speaking interview",
  "Imagine a specific situation where you'd naturally say this",
  "Connect this phrase to a real experience from your life",
  "Visualize a scene that captures the meaning of this phrase",
  "Think of someone you know who would use this expression",
  "Create a mental image that links the phrase to its meaning",
  "Imagine explaining this phrase to a friend",
  "Link this phrase to a news story or movie scene you remember"
];

export const ENGLISH_SCIENCE_TIPS = [
  // Learning science
  "Memory is the residue of thought. The more you THINK about a phrase, the stronger the trace.",
  "Retrieval is re-encoding: struggling to remember actually makes the memory stronger.",
  "Using a phrase in your own sentence creates context-dependent memory \u2014 much stronger than memorizing.",
  "Split your study into 2-3 short sessions instead of one long block for better retention.",
  "The moment of struggle when recalling is EXACTLY when learning happens. Embrace it!",
  "Interleaving (mixing topics) feels harder but produces stronger long-term retention.",
  "Sleep consolidates memory. Study before bed, and your brain rehearses while you sleep.",
  "Spacing effect: reviewing a phrase after 3 days beats reviewing it 3 times in one day.",
  "Mistakes are not failures \u2014 they're data. Each error shows your brain what to focus on.",
  "The forgetting curve is steepest in the first 24 hours. That first review matters most.",
  "Testing yourself is 50% more effective than re-reading. Active recall beats highlighting.",
  "Context matters: learning a phrase in a sentence is 3x more memorable than learning it alone.",
  // IELTS motivation
  "IELTS Band 7+ speakers use idiomatic language naturally \u2014 that's exactly what you're building here.",
  "Examiners notice when you use topic-specific vocabulary. Each phrase you learn boosts your Lexical Resource score.",
  "Don't just memorize \u2014 practice USING these phrases in your own answers. Production beats recognition.",
  "The difference between Band 6 and Band 7 is often just 10-15 well-used phrases per topic.",
  "Native speakers use phrasal verbs and idioms constantly. Learning them makes you sound natural.",
  "Speaking fluency comes from having ready-made chunks, not from translating word by word.",
  "\u201CThe limits of my language mean the limits of my world.\u201D \u2014 Ludwig Wittgenstein",
  "\u201CEvery expert was once a beginner.\u201D \u2014 Helen Hayes",
  "\u201CIt does not matter how slowly you go as long as you do not stop.\u201D \u2014 Confucius",
  "\u201CSuccess is the sum of small efforts, repeated day in and day out.\u201D \u2014 Robert Collier",
  "\u201CThe secret of getting ahead is getting started.\u201D \u2014 Mark Twain"
];

export const ENGLISH_MEMORY_STAGES = [
  {level: 1, name: 'New',        desc: 'Just learned, review in 1 day',        color: '#E74C3C', bg: '#fef2f2', interval: 1},
  {level: 2, name: 'Familiar',   desc: 'Recognized, review in 3 days',         color: '#D67635', bg: '#fff7ed', interval: 3},
  {level: 3, name: 'Practicing', desc: 'Getting stronger, review in 7 days',   color: '#E9B746', bg: '#fefce8', interval: 7},
  {level: 4, name: 'Strong',     desc: 'Solid recall, review in 14 days',      color: '#7E9470', bg: '#f0fdf4', interval: 14},
  {level: 5, name: 'Mastered',   desc: 'Fully retained, final review in 30 days', color: '#324A84', bg: '#eff6ff', interval: 30}
];

export const ENGLISH_SENTENCE_TEMPLATES = {
  // Templates by type index for fallback exercises
  0: ["The ___ is very important.", "I need a ___ for this.", "This ___ is excellent."],
  1: ["I always ___ in the morning.", "You should ___ more often.", "They ___ every day."],
  2: ["The weather is quite ___ .", "She seems very ___ today.", "That was really ___ ."],
  3: ["The ___ of this city is remarkable.", "We noticed a ___ in the area.", "There's a huge ___ here."],
  4: ["I tend to ___ when I'm stressed.", "You should ___ your time wisely.", "They ___ with the community."],
  5: ["It's very ___ in this region.", "The food is extremely ___ here.", "I find it quite ___ ."],
  6: ["She speaks ___ about the topic.", "He works ___ every day.", "They responded ___ ."],
  7: ["You know, I always ___ .", "Well, you could say I ___ .", "Honestly, it's like ___ ."],
  8: ["I live ___ the city centre.", "The park is ___ the river.", "We stayed ___ a small village."],
  9: ["I need to ___ this problem.", "She decided to ___ her old habits.", "They want to ___ new opportunities."]
};

export const ENGLISH_STORAGE_KEY = 'english_ielts';
export const ENGLISH_SYNC_EMAIL_KEY = 'english_ielts_sync_email';
