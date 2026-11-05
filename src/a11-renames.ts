// Schritte A1 words reworded after release: old progress key -> current key.
// Folded in on load and after every cloud pull (applyPatternRenames does the
// merge; old keys stay in the blob but match no row). Never remove an entry:
// a device or cloud copy may still carry the old key.
//
// 2026-11-05 (PM): keep only the base form of nouns. Plural twins fold into the
// singular card; three plural-only rows became singular. Kept plural on purpose:
// die Leute / Ferien / Nebenkosten / Spaghetti (no singular), die Kleider /
// Papiere (other meaning), the -schmerzen compounds (natural usage).
export const A11_RENAMES: {[oldKey: string]: string} = {
  "die speisen": "die speise",
  "die getränke": "das getränk",
  "die nachrichten": "die nachricht",
  "die hausaufgaben": "die hausaufgabe",
  "die schmerzen": "der schmerz",
  "die haare": "das haar",
  "die medikamente": "das medikament",
  "die nudeln": "die nudel",
  "die süßigkeiten": "die süßigkeit",
  "die high heels": "der high heel",
};
