const WORD_EMOJIS = [
  // === Cat 0: Greetings (0-29) ===
  "👋", // 0: Hallo
  "🌅", // 1: Guten Morgen
  "☀️", // 2: Guten Tag
  "🌆", // 3: Guten Abend
  "🌙", // 4: Gute Nacht
  "👋", // 5: Auf Wiedersehen
  "✌️", // 6: Tschüss
  "🙏", // 7: Bitte
  "🤝", // 8: Danke
  "💐", // 9: Vielen Dank
  "😅", // 10: Entschuldigung
  "😔", // 11: Es tut mir leid
  "✅", // 12: Ja
  "❌", // 13: Nein
  "🤔", // 14: Vielleicht
  "🤗", // 15: Willkommen
  "🍻", // 16: Prost
  "🌟", // 17: Alles Gute
  "🎉", // 18: Herzlichen Glückwunsch
  "🎄", // 19: Frohe Weihnachten
  "🎆", // 20: Frohes neues Jahr
  "🍽️", // 21: Guten Appetit
  "🤧", // 22: Gesundheit
  "🔜", // 23: Bis bald
  "📅", // 24: Bis morgen
  "⏳", // 25: Bis später
  "❓", // 26: Wie bitte?
  "👌", // 27: Kein Problem
  "💯", // 28: Genau
  "👍", // 29: Natürlich

  // === Cat 1: Personal Pronouns (30-59) ===
  "🙋", // 30: ich
  "👆", // 31: du
  "👨", // 32: er
  "👩", // 33: sie (she)
  "⚪", // 34: es
  "👫", // 35: wir
  "👥", // 36: ihr
  "👪", // 37: sie (they)
  "🎩", // 38: Sie (formal)
  "🔵", // 39: mein
  "🔴", // 40: dein
  "🟦", // 41: sein
  "🟥", // 42: ihr (her/their)
  "🟢", // 43: unser
  "🟡", // 44: euer
  "🟣", // 45: Ihr (formal)
  "➡️", // 46: mich
  "↪️", // 47: dich
  "👤", // 48: ihn
  "👬", // 49: uns
  "⬅️", // 50: mir
  "↩️", // 51: dir
  "▶️", // 52: ihm
  "◀️", // 53: ihr (dative)
  "🔄", // 54: sich
  "🚶", // 55: man
  "❔", // 56: jemand
  "🚫", // 57: niemand
  "🌐", // 58: alle
  "🔮", // 59: etwas

  // === Cat 2: Numbers (60-109) ===
  "0️⃣", // 60: null
  "1️⃣", // 61: eins
  "2️⃣", // 62: zwei
  "3️⃣", // 63: drei
  "4️⃣", // 64: vier
  "5️⃣", // 65: fünf
  "6️⃣", // 66: sechs
  "7️⃣", // 67: sieben
  "8️⃣", // 68: acht
  "9️⃣", // 69: neun
  "🔟", // 70: zehn
  "🕚", // 71: elf
  "🕛", // 72: zwölf
  "🔢", // 73: dreizehn
  "🔢", // 74: vierzehn
  "🔢", // 75: fünfzehn
  "🔢", // 76: sechzehn
  "🔢", // 77: siebzehn
  "🔢", // 78: achtzehn
  "🔢", // 79: neunzehn
  "🔢", // 80: zwanzig
  "🔢", // 81: einundzwanzig
  "🔢", // 82: dreißig
  "🔢", // 83: vierzig
  "🔢", // 84: fünfzig
  "🔢", // 85: sechzig
  "🔢", // 86: siebzig
  "🔢", // 87: achtzig
  "🔢", // 88: neunzig
  "💯", // 89: hundert
  "🔟", // 90: tausend
  "🏦", // 91: eine Million
  "🥇", // 92: erste
  "🥈", // 93: zweite
  "🥉", // 94: dritte
  "4️⃣", // 95: vierte
  "5️⃣", // 96: fünfte
  "6️⃣", // 97: sechste
  "7️⃣", // 98: siebte
  "8️⃣", // 99: achte
  // 100: neunte (checkpoint)
  "9️⃣", // 100: neunte
  "🔟", // 101: zehnte
  "☝️", // 102: einmal
  "✌️", // 103: zweimal
  "🤟", // 104: dreimal
  "➗", // 105: halb
  "⅓", // 106: das Drittel
  "🔲", // 107: das Viertel
  "✖️", // 108: doppelt
  "👯", // 109: Paar

  // === Cat 3: Days/Time (110-163) ===
  "📆", // 110: Montag
  "📆", // 111: Dienstag
  "📆", // 112: Mittwoch
  "📆", // 113: Donnerstag
  "📆", // 114: Freitag
  "📆", // 115: Samstag
  "📆", // 116: Sonntag
  "📅", // 117: der Tag
  "🗓️", // 118: die Woche
  "📆", // 119: der Monat
  "🎊", // 120: das Jahr
  "❄️", // 121: Januar
  "💘", // 122: Februar
  "🌱", // 123: März
  "🌧️", // 124: April
  "🌸", // 125: Mai
  "☀️", // 126: Juni
  "🏖️", // 127: Juli
  "🌻", // 128: August
  "🍂", // 129: September
  "🎃", // 130: Oktober
  "🍁", // 131: November
  "🎅", // 132: Dezember
  "📌", // 133: heute
  "⏭️", // 134: morgen
  "⏮️", // 135: gestern
  "⏰", // 136: jetzt
  "🕐", // 137: später
  "🌄", // 138: früh
  "🕰️", // 139: spät
  "⏱️", // 140: die Uhr
  "🕑", // 141: die Stunde
  "🕐", // 142: die Minute
  "⏲️", // 143: die Sekunde
  "🌅", // 144: der Morgen
  "🌞", // 145: der Mittag
  "🌤️", // 146: der Nachmittag
  "🌇", // 147: der Abend
  "🌃", // 148: die Nacht
  "🌑", // 149: die Mitternacht
  // 150: das Wochenende (checkpoint)
  "🎉", // 150: das Wochenende
  "🏖️", // 151: der Feiertag
  "⏳", // 152: die Zeit
  "⏪", // 153: vorgestern
  "⏩", // 154: übermorgen
  "📋", // 155: täglich
  "📊", // 156: wöchentlich
  "📈", // 157: monatlich
  "📉", // 158: jährlich
  "📅", // 159: das Datum
  "🗓️", // 160: der Kalender
  "🕓", // 161: die Uhrzeit
  "🕘", // 162: Viertel vor
  "🕒", // 163: Viertel nach

  // === Cat 4: Family (164-198) ===
  "👨‍👩‍👧‍👦", // 164: die Familie
  "👩", // 165: die Mutter
  "👨", // 166: der Vater
  "👫", // 167: die Eltern
  "🧒", // 168: das Kind
  "👦", // 169: der Sohn
  "👧", // 170: die Tochter
  "👦", // 171: der Bruder
  "👧", // 172: die Schwester
  "👵", // 173: die Großmutter
  "👴", // 174: der Großvater
  "👴", // 175: die Großeltern
  "👨", // 176: der Onkel
  "👩", // 177: die Tante
  "🧑", // 178: der Cousin
  "🧑", // 179: die Cousine
  "👦", // 180: der Neffe
  "👧", // 181: die Nichte
  "👦", // 182: der Enkel
  "👧", // 183: die Enkelin
  "🤵", // 184: der Mann
  "👰", // 185: die Frau
  "🧑", // 186: der Freund
  "🧑", // 187: die Freundin
  "👶", // 188: das Baby
  "👦", // 189: die Geschwister
  "👨", // 190: der Schwiegervater
  "👩", // 191: die Schwiegermutter
  "💒", // 192: die Hochzeit
  "👶", // 193: die Geburt
  "🤵", // 194: der Schwager
  "👰", // 195: die Schwägerin
  "🏠", // 196: der Nachbar
  "🏡", // 197: die Nachbarin
  "👯", // 198: der Zwilling

  // === Cat 5: People & Body (199-233) ===
  "🧑", // 199: der Mensch
  // 200: das Mädchen (checkpoint)
  "👧", // 200: das Mädchen
  "👦", // 201: der Junge
  "🎩", // 202: der Herr
  "💃", // 203: die Dame
  "🗣️", // 204: der Kopf
  "💇", // 205: das Haar
  "😊", // 206: das Gesicht
  "👁️", // 207: das Auge
  "👃", // 208: die Nase
  "👄", // 209: der Mund
  "👂", // 210: das Ohr
  "🦷", // 211: der Zahn
  "🦒", // 212: der Hals
  "💪", // 213: die Schulter
  "💪", // 214: der Arm
  "🤚", // 215: die Hand
  "☝️", // 216: der Finger
  "🫃", // 217: der Bauch
  "🔙", // 218: der Rücken
  "🦵", // 219: das Bein
  "🦵", // 220: das Knie
  "🦶", // 221: der Fuß
  "🧴", // 222: die Haut
  "❤️", // 223: das Herz
  "🩸", // 224: das Blut
  "🏋️", // 225: der Körper
  "💋", // 226: die Lippe
  "🫁", // 227: die Brust
  "👍", // 228: der Daumen
  "🦶", // 229: die Zehe
  "💪", // 230: der Ellbogen
  "🧠", // 231: die Stirn
  "😊", // 232: die Wange
  "😶", // 233: das Kinn

  // === Cat 6: Clothing (234-263) ===
  "👔", // 234: die Kleidung
  "👕", // 235: das Hemd
  "👖", // 236: die Hose
  "👗", // 237: das Kleid
  "🩳", // 238: der Rock
  "🧥", // 239: die Jacke
  "🧥", // 240: der Mantel
  "🧶", // 241: der Pullover
  "👕", // 242: das T-Shirt
  "👚", // 243: die Bluse
  "🤵", // 244: der Anzug
  "👖", // 245: die Jeans
  "👟", // 246: der Schuh
  "👢", // 247: der Stiefel
  "🧦", // 248: die Socke
  "🎩", // 249: der Hut
  // 250: die Mütze (checkpoint)
  "🧢", // 250: die Mütze
  "🧣", // 251: der Schal
  "🧤", // 252: die Handschuhe
  "🪢", // 253: der Gürtel
  "👔", // 254: die Krawatte
  "🩱", // 255: der Badeanzug
  "🩲", // 256: die Unterwäsche
  "👜", // 257: die Tasche
  "🎒", // 258: der Rucksack
  "👓", // 259: die Brille
  "💍", // 260: der Ring
  "⌚", // 261: die Uhr
  "☂️", // 262: der Regenschirm
  "💎", // 263: der Schmuck

  // === Cat 7: Colors (264-283) ===
  "🎨", // 264: die Farbe
  "🔴", // 265: rot
  "🔵", // 266: blau
  "🟢", // 267: grün
  "🟡", // 268: gelb
  "⚫", // 269: schwarz
  "⚪", // 270: weiß
  "🩶", // 271: grau
  "🟤", // 272: braun
  "🟠", // 273: orange
  "🩷", // 274: rosa
  "🟣", // 275: lila
  "💜", // 276: violett
  "🌑", // 277: dunkel
  "🌕", // 278: hell
  "🌈", // 279: bunt
  "🥇", // 280: golden
  "🥈", // 281: silbern
  "💠", // 282: türkis
  "🏖️", // 283: beige

  // === Cat 8: Food & Drinks (284-357) ===
  "🍲", // 284: das Essen
  "🥤", // 285: das Trinken
  "🥐", // 286: das Frühstück
  "🍱", // 287: das Mittagessen
  "🍽️", // 288: das Abendessen
  "🍞", // 289: das Brot
  "🥖", // 290: das Brötchen
  "🧈", // 291: die Butter
  "🧀", // 292: der Käse
  "🌭", // 293: die Wurst
  "🥩", // 294: das Fleisch
  "🍗", // 295: das Hähnchen
  "🐟", // 296: der Fisch
  "🥚", // 297: das Ei
  "🍚", // 298: der Reis
  "🍝", // 299: die Nudeln
  // 300: die Kartoffel (checkpoint)
  "🥔", // 300: die Kartoffel
  "🍜", // 301: die Suppe
  "🥗", // 302: der Salat
  "🥦", // 303: das Gemüse
  "🍅", // 304: die Tomate
  "🥒", // 305: die Gurke
  "🧅", // 306: die Zwiebel
  "🧄", // 307: der Knoblauch
  "🥕", // 308: die Karotte
  "🫑", // 309: der Paprika
  "🍄", // 310: der Pilz
  "🥬", // 311: der Spinat
  "🍇", // 312: das Obst
  "🍎", // 313: der Apfel
  "🍐", // 314: die Birne
  "🍌", // 315: die Banane
  "🍊", // 316: die Orange
  "🍓", // 317: die Erdbeere
  "🍇", // 318: die Traube
  "🍒", // 319: die Kirsche
  "🍋", // 320: die Zitrone
  "🍉", // 321: die Wassermelone
  "🍍", // 322: die Ananas
  "🫐", // 323: die Pflaume
  "💧", // 324: das Wasser
  "🧃", // 325: der Saft
  "🥛", // 326: die Milch
  "☕", // 327: der Kaffee
  "🍵", // 328: der Tee
  "🍺", // 329: das Bier
  "🍷", // 330: der Wein
  "🥤", // 331: die Limonade
  "🍬", // 332: der Zucker
  "🧂", // 333: das Salz
  "🌶️", // 334: der Pfeffer
  "🫒", // 335: das Öl
  "🫙", // 336: der Essig
  "🍯", // 337: die Marmelade
  "🍯", // 338: der Honig
  "🍫", // 339: die Schokolade
  "🎂", // 340: der Kuchen
  "🍦", // 341: das Eis
  "🎂", // 342: die Torte
  "🍪", // 343: der Keks
  "🥛", // 344: die Sahne
  "🥛", // 345: der Joghurt
  "🥫", // 346: die Soße
  "🌾", // 347: das Mehl
  "🟡", // 348: der Senf
  "🍟", // 349: die Pommes frites
  // 350: die Pizza (checkpoint)
  "🍕", // 350: die Pizza
  "🥪", // 351: das Sandwich
  "🍮", // 352: der Nachtisch
  "🥗", // 353: die Vorspeise
  "🍛", // 354: das Hauptgericht
  "🥗", // 355: die Beilage
  "📋", // 356: die Speisekarte
  "🥂", // 357: das Getränk

  // === Cat 9: House & Home (358-403) ===
  "🏠", // 358: das Haus
  "🏢", // 359: die Wohnung
  "🚪", // 360: das Zimmer
  "🍳", // 361: die Küche
  "🚿", // 362: das Badezimmer
  "🛏️", // 363: das Schlafzimmer
  "🛋️", // 364: das Wohnzimmer
  "🍽️", // 365: das Esszimmer
  "🚪", // 366: der Flur
  "🌳", // 367: der Garten
  "🏗️", // 368: der Balkon
  "🅿️", // 369: die Garage
  "⬇️", // 370: der Keller
  "🏠", // 371: das Dach
  "🪜", // 372: die Treppe
  "🛗", // 373: der Aufzug
  "🚪", // 374: die Tür
  "🪟", // 375: das Fenster
  "🧱", // 376: die Wand
  "🟫", // 377: der Boden
  "⬜", // 378: die Decke
  "🪑", // 379: der Tisch
  "🪑", // 380: der Stuhl
  "🛋️", // 381: das Sofa
  "🛏️", // 382: das Bett
  "🗄️", // 383: der Schrank
  "📚", // 384: das Regal
  "💡", // 385: die Lampe
  "🪞", // 386: der Spiegel
  "🟫", // 387: der Teppich
  "🚿", // 388: die Dusche
  "🛁", // 389: die Badewanne
  "🚽", // 390: die Toilette
  "🚰", // 391: das Waschbecken
  "🧊", // 392: der Kühlschrank
  "🔥", // 393: der Herd
  "♨️", // 394: der Ofen
  "🧺", // 395: die Waschmaschine
  "📺", // 396: der Fernseher
  "🛏️", // 397: das Kissen
  "🌡️", // 398: die Heizung
  "💰", // 399: die Miete
  // 400: der Vermieter (checkpoint)
  "🏘️", // 400: der Vermieter
  "🔑", // 401: der Mieter
  "🪑", // 402: die Möbel
  "🪟", // 403: der Vorhang

  // === Cat 10: Kitchen (404-418) ===
  "🍽️", // 404: der Teller
  "☕", // 405: die Tasse
  "🥛", // 406: das Glas
  "🍾", // 407: die Flasche
  "🔪", // 408: das Messer
  "🍴", // 409: die Gabel
  "🥄", // 410: der Löffel
  "🍳", // 411: die Pfanne
  "🫕", // 412: der Topf
  "🥣", // 413: die Schüssel
  "🧻", // 414: die Serviette
  "🥫", // 415: die Dose
  "📡", // 416: die Mikrowelle
  "🫖", // 417: der Wasserkocher
  "☕", // 418: die Kaffeemaschine

  // === Cat 11: City & Transport (419-472) ===
  "🏙️", // 419: die Stadt
  "🏘️", // 420: das Dorf
  "🛣️", // 421: die Straße
  "⛲", // 422: der Platz
  "🌉", // 423: die Brücke
  "🌳", // 424: der Park
  "🚉", // 425: der Bahnhof
  "🚏", // 426: die Haltestelle
  "✈️", // 427: der Flughafen
  "🏨", // 428: das Hotel
  "🍴", // 429: das Restaurant
  "☕", // 430: das Café
  "🏦", // 431: die Bank
  "📮", // 432: die Post
  "💊", // 433: die Apotheke
  "🏥", // 434: das Krankenhaus
  "👮", // 435: die Polizei
  "🚒", // 436: die Feuerwehr
  "🏛️", // 437: das Rathaus
  "⛪", // 438: die Kirche
  "🏛️", // 439: das Museum
  "🎭", // 440: das Theater
  "🎬", // 441: das Kino
  "📚", // 442: die Bibliothek
  "🛒", // 443: der Supermarkt
  "🏪", // 444: das Geschäft
  "🏬", // 445: der Markt
  "🥖", // 446: die Bäckerei
  "🥩", // 447: die Metzgerei
  "⛽", // 448: die Tankstelle
  "🚗", // 449: das Auto
  // 450: der Bus (checkpoint)
  "🚌", // 450: der Bus
  "🚊", // 451: die Straßenbahn
  "🚇", // 452: die U-Bahn
  "🚆", // 453: der Zug
  "🚲", // 454: das Fahrrad
  "🏍️", // 455: das Motorrad
  "🚕", // 456: das Taxi
  "✈️", // 457: das Flugzeug
  "🚢", // 458: das Schiff
  "🎫", // 459: die Fahrkarte
  "📋", // 460: der Fahrplan
  "🚦", // 461: die Ampel
  "🅿️", // 462: der Parkplatz
  "🪪", // 463: der Führerschein
  "🚗", // 464: der Stau
  "🔀", // 465: die Kreuzung
  "🚶", // 466: der Bürgersteig
  "🛣️", // 467: die Autobahn
  "⚓", // 468: der Hafen
  "🛤️", // 469: der Weg
  "🧭", // 470: die Richtung
  "🚪", // 471: der Eingang
  "🚶", // 472: der Ausgang

  // === Cat 12: Nature & Weather (473-517) ===
  "🌿", // 473: die Natur
  "🌳", // 474: der Baum
  "🌸", // 475: die Blume
  "🌱", // 476: das Gras
  "🌲", // 477: der Wald
  "🏔️", // 478: der Berg
  "🏞️", // 479: der Fluss
  "🏊", // 480: der See
  "🌊", // 481: das Meer
  "🏖️", // 482: der Strand
  "🏝️", // 483: die Insel
  "💨", // 484: die Luft
  "🌍", // 485: die Erde
  "🪨", // 486: der Stein
  "🔥", // 487: das Feuer
  "🌌", // 488: der Himmel
  "☀️", // 489: die Sonne
  "🌙", // 490: der Mond
  "⭐", // 491: der Stern
  "☁️", // 492: die Wolke
  "🌧️", // 493: der Regen
  "❄️", // 494: der Schnee
  "💨", // 495: der Wind
  "🌪️", // 496: der Sturm
  "⛈️", // 497: das Gewitter
  "🌫️", // 498: der Nebel
  "🧊", // 499: das Eis
  // 500: die Hitze (checkpoint)
  "🥵", // 500: die Hitze
  "🥶", // 501: die Kälte
  "🌤️", // 502: das Wetter
  "🌡️", // 503: die Temperatur
  "🌷", // 504: der Frühling
  "☀️", // 505: der Sommer
  "🍂", // 506: der Herbst
  "⛄", // 507: der Winter
  "🏞️", // 508: die Landschaft
  "🏜️", // 509: das Tal
  "⛰️", // 510: der Hügel
  "🌾", // 511: die Wiese
  "🏖️", // 512: die Küste
  "🌈", // 513: der Regenbogen
  "🌞", // 514: sonnig
  "☁️", // 515: bewölkt
  "🌧️", // 516: regnerisch
  "🌬️", // 517: windig

  // === Cat 13: Animals (518-552) ===
  "🐾", // 518: das Tier
  "🐕", // 519: der Hund
  "🐈", // 520: die Katze
  "🐦", // 521: der Vogel
  "🐠", // 522: der Fisch
  "🐴", // 523: das Pferd
  "🐄", // 524: die Kuh
  "🐷", // 525: das Schwein
  "🐑", // 526: das Schaf
  "🐐", // 527: die Ziege
  "🐔", // 528: das Huhn
  "🦆", // 529: die Ente
  "🐭", // 530: die Maus
  "🐇", // 531: der Hase
  "🐻", // 532: der Bär
  "🐺", // 533: der Wolf
  "🦊", // 534: der Fuchs
  "🐘", // 535: der Elefant
  "🦁", // 536: der Löwe
  "🐒", // 537: der Affe
  "🐍", // 538: die Schlange
  "🐸", // 539: der Frosch
  "🐝", // 540: die Biene
  "🕷️", // 541: die Spinne
  "🦋", // 542: der Schmetterling
  "🐬", // 543: der Delfin
  "🐢", // 544: die Schildkröte
  "🦒", // 545: die Giraffe
  "🐯", // 546: der Tiger
  "🦜", // 547: der Papagei
  "🐜", // 548: die Ameise
  "🐹", // 549: der Hamster
  // 550: das Kaninchen (checkpoint)
  "🐰", // 550: das Kaninchen
  "🕊️", // 551: die Taube
  "🦅", // 552: der Adler

  // === Cat 14: School (553-587) ===
  "🏫", // 553: die Schule
  "🎓", // 554: die Universität
  "📝", // 555: die Klasse
  "👨‍🏫", // 556: der Lehrer
  "👩‍🏫", // 557: die Lehrerin
  "👨‍🎓", // 558: der Schüler
  "👩‍🎓", // 559: die Schülerin
  "🧑‍🎓", // 560: der Student
  "👩‍🎓", // 561: die Studentin
  "📖", // 562: das Buch
  "📓", // 563: das Heft
  "🖊️", // 564: der Stift
  "✏️", // 565: der Bleistift
  "🖊️", // 566: der Kugelschreiber
  "📄", // 567: das Papier
  "🪑", // 568: der Tisch
  "📋", // 569: die Tafel
  "💻", // 570: der Computer
  "📝", // 571: die Prüfung
  "📚", // 572: die Hausaufgabe
  "✅", // 573: die Aufgabe
  "🏋️", // 574: die Übung
  "📌", // 575: das Beispiel
  "❓", // 576: die Frage
  "💬", // 577: die Antwort
  "📚", // 578: der Kurs
  "👨‍🏫", // 579: der Unterricht
  "🅰️", // 580: die Note
  "📃", // 581: das Zeugnis
  "📚", // 582: die Bibliothek
  "👶", // 583: der Kindergarten
  "🏫", // 584: die Grundschule
  "🎓", // 585: das Gymnasium
  "📖", // 586: das Studium
  "📕", // 587: das Wörterbuch

  // === Cat 15: Work (588-633) ===
  "💼", // 588: die Arbeit
  "👷", // 589: der Beruf
  "🏢", // 590: das Büro
  "👨‍💼", // 591: der Chef
  "👩‍💼", // 592: die Chefin
  "🤝", // 593: der Kollege
  "🤝", // 594: die Kollegin
  "👨‍⚕️", // 595: der Arzt
  "👩‍⚕️", // 596: die Ärztin
  "👮‍♂️", // 597: der Polizist
  "👮‍♀️", // 598: die Polizistin
  "👷‍♂️", // 599: der Ingenieur
  // 600: die Ingenieurin (checkpoint)
  "👷‍♀️", // 600: die Ingenieurin
  "🧑‍💼", // 601: der Verkäufer
  "🧑‍💼", // 602: die Verkäuferin
  "👨‍🍳", // 603: der Koch
  "👩‍🍳", // 604: die Köchin
  "🍽️", // 605: der Kellner
  "🍽️", // 606: die Kellnerin
  "💇‍♂️", // 607: der Friseur
  "💇‍♀️", // 608: die Friseurin
  "🚗", // 609: der Fahrer
  "🔧", // 610: der Mechaniker
  "👨‍🌾", // 611: der Bauer
  "📰", // 612: der Journalist
  "⚖️", // 613: der Anwalt
  "⚖️", // 614: die Anwältin
  "🏛️", // 615: der Beamte
  "🏢", // 616: die Firma
  "💰", // 617: das Gehalt
  "📝", // 618: die Bewerbung
  "🤝", // 619: das Vorstellungsgespräch
  "📜", // 620: der Vertrag
  "📊", // 621: die Erfahrung
  "😞", // 622: arbeitslos
  "🧑‍💻", // 623: der Praktikant
  "🧑‍💻", // 624: die Praktikantin
  "📊", // 625: die Besprechung
  "📁", // 626: das Projekt
  "📅", // 627: der Termin
  "☕", // 628: die Pause
  "👨‍⚕️", // 629: der Krankenpfleger
  "👩‍⚕️", // 630: die Krankenschwester
  "💻", // 631: der Programmierer
  "🏗️", // 632: der Architekt
  "🎵", // 633: der Musiker

  // === Cat 16: Communication (634-663) ===
  "📞", // 634: das Telefon
  "📱", // 635: das Handy
  "🖥️", // 636: der Computer
  "🌐", // 637: das Internet
  "📧", // 638: die E-Mail
  "💬", // 639: die Nachricht
  "✉️", // 640: der Brief
  "🏞️", // 641: die Postkarte
  "📲", // 642: der Anruf
  "🔢", // 643: die Nummer
  "🏠", // 644: die Adresse
  "🌐", // 645: die Webseite
  "🔐", // 646: das Passwort
  "🖨️", // 647: der Drucker
  "⌨️", // 648: die Tastatur
  "🖱️", // 649: die Maus
  // 650: der Bildschirm (checkpoint)
  "🖥️", // 650: der Bildschirm
  "📸", // 651: das Foto
  "🎥", // 652: das Video
  "📲", // 653: die App
  "💻", // 654: der Laptop
  "📱", // 655: das Tablet
  "⚙️", // 656: das Programm
  "📂", // 657: die Datei
  "📄", // 658: das Dokument
  "📷", // 659: die Kamera
  "🔗", // 660: das Netzwerk
  "⬇️", // 661: herunterladen
  "⬆️", // 662: hochladen
  "🔌", // 663: das Kabel

  // === Cat 17: Health (664-693) ===
  "💚", // 664: die Gesundheit
  "🤒", // 665: die Krankheit
  "😣", // 666: der Schmerz
  "🤒", // 667: das Fieber
  "😷", // 668: der Husten
  "🤧", // 669: der Schnupfen
  "🤒", // 670: die Erkältung
  "🤢", // 671: die Grippe
  "💊", // 672: die Tablette
  "💉", // 673: das Medikament
  "📋", // 674: das Rezept
  "🏥", // 675: die Apotheke
  "🩺", // 676: der Arzt
  "🏥", // 677: das Krankenhaus
  "🚑", // 678: der Krankenwagen
  "🛡️", // 679: die Versicherung
  "🤧", // 680: die Allergie
  "😴", // 681: müde
  "🤕", // 682: krank
  "💪", // 683: gesund
  "🤯", // 684: der Kopfschmerz
  "🤮", // 685: der Bauchschmerz
  "🦷", // 686: der Zahnarzt
  "🏥", // 687: die Operation
  "🩹", // 688: das Pflaster
  "🩹", // 689: der Verband
  "💉", // 690: die Spritze
  "🔬", // 691: die Untersuchung
  "📅", // 692: der Termin
  "🚨", // 693: die Notaufnahme

  // === Cat 18: Common Verbs (694-806) ===
  "🟰", // 694: sein
  "🤲", // 695: haben
  "🔄", // 696: werden
  "💪", // 697: können
  "⚠️", // 698: müssen
  "📌", // 699: sollen
  // 700: wollen (checkpoint)
  "🎯", // 700: wollen
  "🟢", // 701: dürfen
  "❤️", // 702: mögen
  "🙂", // 703: möchten
  "⚡", // 704: machen
  "🚶", // 705: gehen
  "🔜", // 706: kommen
  "👀", // 707: sehen
  "🤲", // 708: geben
  "✊", // 709: nehmen
  "🔍", // 710: finden
  "🗣️", // 711: sagen
  "💬", // 712: sprechen
  "👂", // 713: hören
  "📖", // 714: lesen
  "✍️", // 715: schreiben
  "🧠", // 716: wissen
  "🤝", // 717: kennen
  "💡", // 718: verstehen
  "📚", // 719: lernen
  "🤔", // 720: denken
  "🙏", // 721: glauben
  "💭", // 722: meinen
  "🫀", // 723: fühlen
  "🍽️", // 724: essen
  "🥤", // 725: trinken
  "👨‍🍳", // 726: kochen
  "😴", // 727: schlafen
  "⏰", // 728: aufstehen
  "🌅", // 729: aufwachen
  "🏠", // 730: wohnen
  "🌱", // 731: leben
  "💼", // 732: arbeiten
  "🎮", // 733: spielen
  "🚗", // 734: fahren
  "✈️", // 735: fliegen
  "🏃", // 736: laufen
  "🏊", // 737: schwimmen
  "🪑", // 738: sitzen
  "🧍", // 739: stehen
  "🛏️", // 740: liegen
  "📦", // 741: bringen
  "🎒", // 742: tragen
  "🛒", // 743: kaufen
  "🏷️", // 744: verkaufen
  "💳", // 745: bezahlen
  "💲", // 746: kosten
  "🙋", // 747: brauchen
  "🤝", // 748: helfen
  // 750: antworten (checkpoint - close enough at 749)
  "❓", // 749: fragen
  "💬", // 750: antworten
  "📖", // 751: erzählen
  "📐", // 752: erklären
  "👉", // 753: zeigen
  "⏳", // 754: warten
  "🔎", // 755: suchen
  "▶️", // 756: beginnen
  "🚀", // 757: anfangen
  "⏹️", // 758: aufhören
  "🔓", // 759: öffnen
  "🔒", // 760: schließen
  "🫥", // 761: vergessen
  "💭", // 762: erinnern
  "🔄", // 763: versuchen
  "🏠", // 764: besuchen
  "💌", // 765: einladen
  "🤝", // 766: treffen
  "💕", // 767: lieben
  "😡", // 768: hassen
  "😂", // 769: lachen
  "😢", // 770: weinen
  "💃", // 771: tanzen
  "🎤", // 772: singen
  "🧳", // 773: reisen
  "🥾", // 774: wandern
  "🧼", // 775: waschen
  "🧹", // 776: putzen
  "🔧", // 777: reparieren
  "🔄", // 778: ändern
  "📬", // 779: bekommen
  "📤", // 780: schicken
  "📞", // 781: anrufen
  "🔨", // 782: benutzen
  "💡", // 783: bedeuten
  "⚡", // 784: passieren
  "⚙️", // 785: funktionieren
  "✅", // 786: stimmen
  "😊", // 787: gefallen
  "🏷️", // 788: gehören
  "👌", // 789: passen
  "🤞", // 790: hoffen
  "🌠", // 791: wünschen
  "😄", // 792: freuen
  "🧐", // 793: interessieren
  "😤", // 794: stören
  "⏱️", // 795: dauern
  "⬇️", // 796: fallen
  "🫳", // 797: ziehen
  "🫸", // 798: drücken
  "✂️", // 799: schneiden
  // 800: werfen (checkpoint)
  "🤾", // 800: werfen
  "🤜", // 801: halten
  "🖼️", // 802: hängen
  "🙏", // 803: bitten
  "⭐", // 804: empfehlen
  "😞", // 805: verlieren
  "🏆", // 806: gewinnen

  // === Cat 19: Separable/Reflexive Verbs (807-836) ===
  "🛬", // 807: ankommen
  "🛫", // 808: abfahren
  "🛍️", // 809: einkaufen
  "🧹", // 810: aufräumen
  "👔", // 811: anziehen
  "👕", // 812: ausziehen
  "🤲", // 813: mitnehmen
  "🎁", // 814: mitbringen
  "↩️", // 815: zurückkommen
  "🔀", // 816: umsteigen
  "🚪", // 817: einsteigen
  "🚶", // 818: aussteigen
  "📺", // 819: fernsehen
  "👂", // 820: zuhören
  "📋", // 821: vorbereiten
  "🙋", // 822: teilnehmen
  "🤝", // 823: kennenlernen
  "🚶‍♂️", // 824: spazieren gehen
  "📍", // 825: stattfinden
  "🙋‍♂️", // 826: vorstellen
  "🪑", // 827: sich setzen
  "🧼", // 828: sich waschen
  "👔", // 829: sich anziehen
  "😌", // 830: sich ausruhen
  "🏃‍♂️", // 831: sich beeilen
  "😊", // 832: sich freuen
  "🫀", // 833: sich fühlen
  "🤝", // 834: sich treffen
  "🙇", // 835: sich entschuldigen
  "💭", // 836: sich erinnern

  // === Cat 20: Adjectives (837-940) ===
  "📏", // 837: groß
  "🤏", // 838: klein
  "📐", // 839: lang
  "✂️", // 840: kurz
  "👴", // 841: alt
  "🆕", // 842: neu
  "🧒", // 843: jung
  "👍", // 844: gut
  "👎", // 845: schlecht
  "🌹", // 846: schön
  "👹", // 847: hässlich
  "🏎️", // 848: schnell
  "🐢", // 849: langsam
  // 850: schwer (checkpoint)
  "🏋️", // 850: schwer
  "🪶", // 851: leicht
  "🔥", // 852: heiß
  "🥶", // 853: kalt
  "🌤️", // 854: warm
  "❄️", // 855: kühl
  "💧", // 856: nass
  "🏜️", // 857: trocken
  "✨", // 858: sauber
  "🦠", // 859: schmutzig
  "🔊", // 860: laut
  "🤫", // 861: leise
  "💡", // 862: hell
  "🌑", // 863: dunkel
  "🈵", // 864: voll
  "⭕", // 865: leer
  "🔓", // 866: offen
  "🔒", // 867: geschlossen
  "✅", // 868: richtig
  "❌", // 869: falsch
  "⚠️", // 870: wichtig
  "🤩", // 871: interessant
  "😴", // 872: langweilig
  "🟰", // 873: einfach
  "🧩", // 874: schwierig
  "✅", // 875: möglich
  "🚫", // 876: unmöglich
  "❗", // 877: nötig
  "🏁", // 878: fertig
  "🟢", // 879: bereit
  "🕊️", // 880: frei
  "🔴", // 881: besetzt
  "🏷️", // 882: billig
  "💎", // 883: teuer
  "💰", // 884: reich
  "😔", // 885: arm
  "😊", // 886: glücklich
  "😢", // 887: traurig
  "😴", // 888: müde
  "😳", // 889: wach
  "🍽️", // 890: hungrig
  "🥤", // 891: durstig
  "😊", // 892: freundlich
  "😠", // 893: unfreundlich
  "🥰", // 894: nett
  "😈", // 895: böse
  "🤣", // 896: lustig
  "😐", // 897: ernst
  "😌", // 898: ruhig
  "😰", // 899: nervös
  // 900: stolz (checkpoint)
  "🦚", // 900: stolz
  "🛡️", // 901: sicher
  "⚠️", // 902: gefährlich
  "🌟", // 903: bekannt
  "⭐", // 904: berühmt
  "🔄", // 905: ähnlich
  "↔️", // 906: verschieden
  "🟰", // 907: gleich
  "📌", // 908: typisch
  "➖", // 909: normal
  "✨", // 910: besonder
  "🤩", // 911: wunderbar
  "🎉", // 912: fantastisch
  "💯", // 913: perfekt
  "😬", // 914: schlimm
  "💪", // 915: stark
  "😩", // 916: schwach
  "🟫", // 917: dick
  "📄", // 918: dünn
  "↔️", // 919: breit
  "🔲", // 920: eng
  "🕳️", // 921: tief
  "🏔️", // 922: hoch
  "🔴", // 923: rund
  "🔷", // 924: eckig
  "🧸", // 925: weich
  "🪨", // 926: hart
  "🍬", // 927: süß
  "🍋", // 928: sauer
  "☕", // 929: bitter
  "🌶️", // 930: scharf
  "🌿", // 931: frisch
  "😋", // 932: lecker
  "🛋️", // 933: gemütlich
  "🔨", // 934: praktisch
  "🤨", // 935: komisch
  "🎩", // 936: höflich
  "😤", // 937: unhöflich
  "😊", // 938: zufrieden
  "🤪", // 939: verrückt
  "🧐", // 940: neugierig

  // === Cat 21: Question Words (941-955) ===
  "👤", // 941: wer
  "❓", // 942: was
  "📍", // 943: wo
  "⏰", // 944: wann
  "🤷", // 945: warum
  "🔧", // 946: wie
  "💰", // 947: wie viel
  "🔢", // 948: wie viele
  "👉", // 949: welcher
  // 950: woher (checkpoint)
  "🔙", // 950: woher
  "🔜", // 951: wohin
  "⏳", // 952: wie lange
  "🔁", // 953: wie oft
  "🎂", // 954: wie alt
  "📏", // 955: wie weit

  // === Cat 22: Prepositions & Conjunctions (956-997) ===
  "📥", // 956: in
  "📌", // 957: an
  "⬆️", // 958: auf
  "⬇️", // 959: unter
  "🔝", // 960: über
  "↔️", // 961: neben
  "⚖️", // 962: zwischen
  "⏮️", // 963: vor
  "🔙", // 964: hinter
  "🔗", // 965: mit
  "🚫", // 966: ohne
  "➡️", // 967: für
  "🛡️", // 968: gegen
  "🔄", // 969: um
  "📤", // 970: aus
  "📍", // 971: bei
  "➡️", // 972: nach
  "⏰", // 973: seit
  "↗️", // 974: von
  "↘️", // 975: zu
  "⏹️", // 976: bis
  "🚇", // 977: durch
  "⏳", // 978: während
  "📎", // 979: wegen
  "💪", // 980: trotz
  "➕", // 981: und
  "🔀", // 982: oder
  "↩️", // 983: aber
  "💡", // 984: denn
  "📌", // 985: weil
  "📎", // 986: dass
  "🔁", // 987: wenn
  "⏰", // 988: als
  "❓", // 989: ob
  "🤷", // 990: obwohl
  "➡️", // 991: deshalb
  "💪", // 992: trotzdem
  "↪️", // 993: sondern
  "➕", // 994: sowohl...als auch
  "➖", // 995: weder...noch
  "🔀", // 996: entweder...oder
  "➕", // 997: nicht nur...sondern auch

  // === Cat 23: Adverbs (998-1053) ===
  "📍", // 998: hier
  "👉", // 999: dort
  // 1000: oben (checkpoint)
  "⬆️", // 1000: oben
  "⬇️", // 1001: unten
  "⬅️", // 1002: links
  "➡️", // 1003: rechts
  "⬆️", // 1004: geradeaus
  "🔝", // 1005: vorne
  "🔙", // 1006: hinten
  "🌳", // 1007: draußen
  "🏠", // 1008: drinnen
  "🌍", // 1009: überall
  "🚫", // 1010: nirgendwo
  "🤝", // 1011: zusammen
  "🧍", // 1012: allein
  "‼️", // 1013: sehr
  "⚠️", // 1014: zu
  "🔸", // 1015: ziemlich
  "🔜", // 1016: fast
  "☝️", // 1017: nur
  "➕", // 1018: auch
  "✅", // 1019: schon
  "⏳", // 1020: noch
  "🚫", // 1021: nie
  "♾️", // 1022: immer
  "🔁", // 1023: oft
  "🎲", // 1024: manchmal
  "💎", // 1025: selten
  "🔄", // 1026: wieder
  "⏰", // 1027: gerade
  "🏁", // 1028: endlich
  "⚡", // 1029: plötzlich
  "⭐", // 1030: besonders
  "🤏", // 1031: ungefähr
  "💯", // 1032: bestimmt
  "🤔", // 1033: wahrscheinlich
  "🔍", // 1034: eigentlich
  "❗", // 1035: wirklich
  "✅", // 1036: genug
  "🏃", // 1037: sofort
  "🔜", // 1038: bald
  "1️⃣", // 1039: zuerst
  "2️⃣", // 1040: dann
  "3️⃣", // 1041: danach
  "📌", // 1042: zum Beispiel
  "💡", // 1043: das heißt
  "➡️", // 1044: so
  "😊", // 1045: gern
  "😞", // 1046: leider
  "🤞", // 1047: hoffentlich
  "📊", // 1048: normalerweise
  "📈", // 1049: meistens
  // 1050: mindestens (checkpoint)
  "⬇️", // 1050: mindestens
  "⬆️", // 1051: höchstens
  "⏳", // 1052: inzwischen
  "➕", // 1053: außerdem

  // === Cat 24: Shopping (1054-1083) ===
  "💵", // 1054: das Geld
  "💶", // 1055: der Euro
  "🪙", // 1056: der Cent
  "🏷️", // 1057: der Preis
  "🎁", // 1058: das Angebot
  "🧾", // 1059: die Rechnung
  "🧾", // 1060: die Quittung
  "🛒", // 1061: die Kasse
  "💳", // 1062: die Kreditkarte
  "💵", // 1063: bar
  "📏", // 1064: die Größe
  "🧩", // 1065: das Stück
  "⚖️", // 1066: das Kilo
  "🫗", // 1067: der Liter
  "⚖️", // 1068: das Gramm
  "📦", // 1069: die Packung
  "🛍️", // 1070: die Tüte
  "🛒", // 1071: der Einkaufswagen
  "🧑‍💼", // 1072: der Kunde
  "👩‍💼", // 1073: die Kundin
  "🔖", // 1074: das Sonderangebot
  "📉", // 1075: der Rabatt
  "🔄", // 1076: umtauschen
  "↩️", // 1077: zurückgeben
  "💰", // 1078: das Trinkgeld
  "🪙", // 1079: die Münze
  "💴", // 1080: der Geldschein
  "🏦", // 1081: das Konto
  "🏦", // 1082: die Überweisung
  "🏧", // 1083: der Geldautomat

  // === Cat 25: Travel (1084-1113) ===
  "🧳", // 1084: die Reise
  "🏖️", // 1085: der Urlaub
  "🚌", // 1086: der Ausflug
  "📷", // 1087: der Tourist
  "🧳", // 1088: das Gepäck
  "💼", // 1089: der Koffer
  "🛂", // 1090: der Pass
  "📃", // 1091: das Visum
  "📅", // 1092: die Reservierung
  "🛏️", // 1093: die Unterkunft
  "🛏️", // 1094: das Einzelzimmer
  "🛏️", // 1095: das Doppelzimmer
  "🏡", // 1096: die Pension
  "🏠", // 1097: die Jugendherberge
  "⛺", // 1098: der Campingplatz
  "🗽", // 1099: die Sehenswürdigkeit
  // 1100: die Landkarte (checkpoint)
  "🗺️", // 1100: die Landkarte
  "🗺️", // 1101: der Stadtplan
  "ℹ️", // 1102: die Information
  "📕", // 1103: der Reiseführer
  "🛫", // 1104: die Abfahrt
  "🛬", // 1105: die Ankunft
  "🚪", // 1106: der Ausgang
  "🚪", // 1107: der Eingang
  "🛃", // 1108: die Grenze
  "🌍", // 1109: das Ausland
  "🏠", // 1110: das Inland
  "🏖️", // 1111: der Strand
  "📮", // 1112: die Postkarte
  "🎁", // 1113: das Souvenir

  // === Cat 26: Emotions (1114-1138) ===
  "😊", // 1114: die Freude
  "😨", // 1115: die Angst
  "❤️", // 1116: die Liebe
  "🤞", // 1117: die Hoffnung
  "😲", // 1118: die Überraschung
  "😟", // 1119: die Sorge
  "😡", // 1120: die Wut
  "🍀", // 1121: das Glück
  "😣", // 1122: das Pech
  "🥱", // 1123: die Langeweile
  "🤝", // 1124: das Vertrauen
  "😞", // 1125: die Enttäuschung
  "🎉", // 1126: der Spaß
  "🧐", // 1127: das Interesse
  "💬", // 1128: die Meinung
  "💡", // 1129: die Idee
  "🌠", // 1130: der Wunsch
  "💤", // 1131: der Traum
  "🧩", // 1132: das Problem
  "🔑", // 1133: die Lösung
  "⚖️", // 1134: die Entscheidung
  "📌", // 1135: der Grund
  "👍", // 1136: der Vorteil
  "👎", // 1137: der Nachteil
  "🎯", // 1138: die Chance

  // === Cat 27: Leisure (1139-1173) ===
  "🎨", // 1139: das Hobby
  "⚽", // 1140: der Sport
  "⚽", // 1141: der Fußball
  "🏀", // 1142: der Basketball
  "🎾", // 1143: der Tennis
  "🏊", // 1144: das Schwimmen
  "🏃", // 1145: das Laufen
  "🥾", // 1146: das Wandern
  "🚴", // 1147: das Radfahren
  "🎵", // 1148: die Musik
  "🎶", // 1149: das Konzert
  // 1150: das Lied (checkpoint)
  "🎵", // 1150: das Lied
  "🎸", // 1151: das Instrument
  "🎸", // 1152: die Gitarre
  "🎹", // 1153: das Klavier
  "🖼️", // 1154: das Bild
  "🎨", // 1155: die Kunst
  "🎲", // 1156: das Spiel
  "👥", // 1157: die Mannschaft
  "🎊", // 1158: die Party
  "🎪", // 1159: das Fest
  "🎬", // 1160: das Kino
  "🎞️", // 1161: der Film
  "📰", // 1162: die Zeitung
  "📰", // 1163: die Zeitschrift
  "📺", // 1164: das Fernsehen
  "📻", // 1165: das Radio
  "📡", // 1166: die Sendung
  "📖", // 1167: der Roman
  "📜", // 1168: das Gedicht
  "🏟️", // 1169: der Verein
  "🏟️", // 1170: das Stadion
  "🖼️", // 1171: die Ausstellung
  "🎭", // 1172: die Galerie
  "📸", // 1173: fotografieren

  // === Cat 28: Countries (1174-1208) ===
  "🇩🇪", // 1174: Deutschland
  "🇦🇹", // 1175: Österreich
  "🇨🇭", // 1176: die Schweiz
  "🇫🇷", // 1177: Frankreich
  "🇬🇧", // 1178: England
  "🇪🇸", // 1179: Spanien
  "🇮🇹", // 1180: Italien
  "🇹🇷", // 1181: die Türkei
  "🇷🇺", // 1182: Russland
  "🇨🇳", // 1183: China
  "🇯🇵", // 1184: Japan
  "🇺🇸", // 1185: die USA
  "🇧🇷", // 1186: Brasilien
  "🇮🇳", // 1187: Indien
  "🇪🇬", // 1188: Ägypten
  "🇩🇪", // 1189: Deutsch
  "🇬🇧", // 1190: Englisch
  "🇫🇷", // 1191: Französisch
  "🇪🇸", // 1192: Spanisch
  "🇮🇹", // 1193: Italienisch
  "🇹🇷", // 1194: Türkisch
  "🇷🇺", // 1195: Russisch
  "🇨🇳", // 1196: Chinesisch
  "🇯🇵", // 1197: Japanisch
  "🇸🇦", // 1198: Arabisch
  "🗣️", // 1199: die Sprache
  // 1200: die Muttersprache (checkpoint)
  "👩‍👦", // 1200: die Muttersprache
  "🌍", // 1201: der Ausländer
  "🌍", // 1202: die Ausländerin
  "🎭", // 1203: die Kultur
  "🇵🇱", // 1204: Polen
  "🇬🇷", // 1205: Griechenland
  "🇵🇹", // 1206: Portugal
  "🇳🇱", // 1207: die Niederlande
  "🇸🇪", // 1208: Schweden

  // === Cat 29: Abstract (1209-1249) ===
  "📋", // 1209: die Sache
  "🔲", // 1210: das Ding
  "📝", // 1211: das Thema
  "🧩", // 1212: der Teil
  "🔖", // 1213: die Art
  "🔄", // 1214: die Weise
  "📄", // 1215: die Seite
  "⚖️", // 1216: die Mitte
  "🏁", // 1217: das Ende
  "🚀", // 1218: der Anfang
  "📍", // 1219: die Stelle
  "💺", // 1220: der Platz
  "📌", // 1221: der Ort
  "🧭", // 1222: die Richtung
  "🛤️", // 1223: der Weg
  "🎯", // 1224: das Ziel
  "📏", // 1225: die Regel
  "📜", // 1226: das Gesetz
  "⚖️", // 1227: das Recht
  "📋", // 1228: die Pflicht
  "🗽", // 1229: die Freiheit
  "💎", // 1230: die Wahrheit
  "🤥", // 1231: die Lüge
  "📚", // 1232: die Geschichte
  "🔮", // 1233: die Zukunft
  "⏮️", // 1234: die Vergangenheit
  "⏸️", // 1235: die Gegenwart
  "👥", // 1236: die Gesellschaft
  "🌍", // 1237: die Umwelt
  "🎓", // 1238: die Bildung
  "🧠", // 1239: das Wissen
  "🔬", // 1240: die Wissenschaft
  "⚙️", // 1241: die Technik
  "📈", // 1242: die Wirtschaft
  "🏛️", // 1243: die Politik
  "🙏", // 1244: die Religion
  "🏺", // 1245: die Tradition
  "🕊️", // 1246: der Frieden
  "⚔️", // 1247: der Krieg
  "🛡️", // 1248: die Sicherheit
  "⚠️", // 1249: die Gefahr

  // === Cat 30: Everyday Expressions (1250-1285) ===
  // 1250: Wie geht es Ihnen? (checkpoint)
  "🤵", // 1250: Wie geht es Ihnen?
  "😄", // 1251: Wie geht's?
  "😊", // 1252: Mir geht es gut
  "😐", // 1253: Nicht schlecht
  "🤷", // 1254: Ich verstehe nicht
  "🔁", // 1255: Können Sie das wiederholen?
  "🇬🇧", // 1256: Sprechen Sie Englisch?
  "🗣️", // 1257: Ich spreche ein bisschen Deutsch
  "❓", // 1258: Wie heißen Sie?
  "🏷️", // 1259: Ich heiße...
  "🌍", // 1260: Woher kommen Sie?
  "🏠", // 1261: Ich komme aus...
  "📍", // 1262: Wo wohnen Sie?
  "🏡", // 1263: Ich wohne in...
  "💼", // 1264: Was machen Sie beruflich?
  "💰", // 1265: Wie viel kostet das?
  "🙋", // 1266: Ich hätte gern...
  "🧾", // 1267: Die Rechnung, bitte
  "📍", // 1268: Wo ist...?
  "🔎", // 1269: Gibt es...?
  "❓", // 1270: Was ist das?
  "🎂", // 1271: Ich bin...Jahre alt
  "👍", // 1272: Es gefällt mir
  "😔", // 1273: Es tut mir leid
  "👌", // 1274: Kein Problem
  "🤷", // 1275: Das macht nichts
  "🤝", // 1276: Ich bin einverstanden
  "💭", // 1277: Keine Ahnung
  "✅", // 1278: Stimmt
  "👍", // 1279: Natürlich
  "💯", // 1280: Auf jeden Fall
  "🆘", // 1281: Ich brauche Hilfe
  "🙋‍♀️", // 1282: Können Sie mir helfen?
  "💡", // 1283: Das verstehe ich
  "✍️", // 1284: Wie schreibt man das?
  "🔄", // 1285: Noch einmal, bitte

  // === Cat 31: Misc Important (1286-1337) ===
  "🌱", // 1286: das Leben
  "💀", // 1287: der Tod
  "🏷️", // 1288: der Name
  "🔢", // 1289: die Nummer
  "👥", // 1290: die Gruppe
  "📋", // 1291: die Liste
  "📝", // 1292: das Wort
  "📃", // 1293: der Satz
  "📄", // 1294: der Text
  "🗣️", // 1295: die Sprache
  "🎙️", // 1296: die Stimme
  "🪧", // 1297: das Zeichen
  "❌", // 1298: der Fehler
  "🆘", // 1299: die Hilfe
  // 1300: das Geschenk (checkpoint)
  "🎁", // 1300: das Geschenk
  "🔑", // 1301: der Schlüssel
  "💡", // 1302: das Licht
  "👤", // 1303: der Schatten
  "🔊", // 1304: das Geräusch
  "🎵", // 1305: die Musik
  "👃", // 1306: der Geruch
  "👅", // 1307: der Geschmack
  "🏃", // 1308: die Bewegung
  "😌", // 1309: die Ruhe
  "📊", // 1310: die Ordnung
  "🌀", // 1311: das Chaos
  "🎯", // 1312: die Chance
  "⚠️", // 1313: das Risiko
  "📊", // 1314: die Erfahrung
  "📈", // 1315: das Ergebnis
  "➡️", // 1316: die Folge
  "↔️", // 1317: der Unterschied
  "🔗", // 1318: die Verbindung
  "💑", // 1319: die Beziehung
  "🎪", // 1320: die Veranstaltung
  "⚖️", // 1321: die Verantwortung
  "🏆", // 1322: der Erfolg
  "📈", // 1323: der Fortschritt
  "🔓", // 1324: die Möglichkeit
  "🎯", // 1325: die Gelegenheit
  "📌", // 1326: das Beispiel
  "🏋️", // 1327: die Übung
  "🧩", // 1328: das Stück
  "🔷", // 1329: die Form
  "📏", // 1330: die Größe
  "⚖️", // 1331: das Gewicht
  "📐", // 1332: die Länge
  "↔️", // 1333: die Breite
  "📐", // 1334: die Höhe
  "🛣️", // 1335: die Entfernung
  "📋", // 1336: der Inhalt
  "⭐", // 1337: die Qualität

  // === Cat 32: Daily Routines (1338-1357) ===
  "⏰", // 1338: aufwachen
  "🚿", // 1339: duschen
  "🪥", // 1340: sich die Zähne putzen
  "🥐", // 1341: frühstücken
  "🚶‍♂️", // 1342: zur Arbeit gehen
  "🏠", // 1343: nach Hause kommen
  "🍽️", // 1344: zu Abend essen
  "🛏️", // 1345: ins Bett gehen
  "👔", // 1346: sich umziehen
  "🧽", // 1347: spülen
  "🧹", // 1348: staubsaugen
  "👕", // 1349: bügeln
  // 1350: einkaufen gehen (checkpoint)
  "🛍️", // 1350: einkaufen gehen
  "🧺", // 1351: Wäsche waschen
  "🍽️", // 1352: den Tisch decken
  "🗑️", // 1353: den Müll rausbringen
  "📰", // 1354: Zeitung lesen
  "📻", // 1355: Radio hören
  "☕", // 1356: Kaffee trinken
  "✅", // 1357: fertig machen

  // === Cat 33: Restaurant (1358-1377) ===
  "📋", // 1358: bestellen
  "🤵", // 1359: der Ober
  "📜", // 1360: die Speisekarte
  "🥗", // 1361: die Vorspeise
  "🍛", // 1362: das Hauptgericht
  "🍰", // 1363: der Nachtisch
  "🥦", // 1364: die Beilage
  "💰", // 1365: das Trinkgeld
  "📅", // 1366: reservieren
  "🏠", // 1367: der Stammgast
  "🧾", // 1368: die Rechnung
  "💳", // 1369: zahlen
  "⭐", // 1370: empfehlen
  "🍴", // 1371: probieren
  "😋", // 1372: schmecken
  "🥬", // 1373: vegetarisch
  "🍽️", // 1374: die Portion
  "🥡", // 1375: zum Mitnehmen
  "🥂", // 1376: das Getränk
  "🤵", // 1377: die Bedienung

  // === Cat 34: Materials (1378-1397) ===
  "🪵", // 1378: das Holz
  "⚙️", // 1379: das Metall
  "🧴", // 1380: das Plastik
  "🥛", // 1381: das Glas
  "📄", // 1382: das Papier
  "🧵", // 1383: der Stoff
  "🐑", // 1384: die Wolle
  "🌿", // 1385: die Baumwolle
  "👜", // 1386: das Leder
  "🥇", // 1387: das Gold
  "🥈", // 1388: das Silber
  "🔴", // 1389: das Gummi
  "🪱", // 1390: die Seide
  "🔩", // 1391: der Stahl
  "🧪", // 1392: der Kunststoff
  "📦", // 1393: die Pappe
  "📦", // 1394: der Karton
  "🫧", // 1395: die Folie
  "🔌", // 1396: der Draht
  "🪢", // 1397: die Schnur

  // === Cat 35: Directions (1398-1417) ===
  "⬆️", // 1398: der Norden
  "⬇️", // 1399: der Süden
  // 1400: der Osten (checkpoint)
  "➡️", // 1400: der Osten
  "⬅️", // 1401: der Westen
  "🔄", // 1402: gegenüber
  "➡️", // 1403: entlang
  "↪️", // 1404: um die Ecke
  "📍", // 1405: in der Nähe
  "🏔️", // 1406: weit weg
  "↩️", // 1407: abbiegen
  "🚶", // 1408: überqueren
  "⏩", // 1409: weitergehen
  "🔙", // 1410: zurückgehen
  "😵", // 1411: sich verlaufen
  "🗺️", // 1412: die Karte
  "📱", // 1413: das Navi
  "🚧", // 1414: die Umleitung
  "⚡", // 1415: die Abkürzung
  "🔄", // 1416: der Kreisverkehr
  "🚗", // 1417: die Einbahnstraße

  // === Cat 36: Housing (1418-1437) ===
  "💰", // 1418: die Miete
  "🏘️", // 1419: der Vermieter
  "🔑", // 1420: der Mieter
  "💵", // 1421: die Kaution
  "📊", // 1422: die Nebenkosten
  "📜", // 1423: der Mietvertrag
  "📥", // 1424: einziehen
  "📤", // 1425: ausziehen
  "🚚", // 1426: umziehen
  "👥", // 1427: die Wohngemeinschaft
  "🛋️", // 1428: möbliert
  "⬜", // 1429: unmöbliert
  "🏢", // 1430: das Erdgeschoss
  "🏢", // 1431: der Stock
  "🏢", // 1432: die Etage
  "🏘️", // 1433: die Hausverwaltung
  "🔔", // 1434: klingeln
  "📬", // 1435: der Briefkasten
  "🏡", // 1436: der Innenhof
  "📰", // 1437: die Wohnungsanzeige

  // === Cat 37: Government (1438-1457) ===
  "🏛️", // 1438: der Staat
  "🗺️", // 1439: das Land
  "🏙️", // 1440: die Hauptstadt
  "👔", // 1441: der Präsident
  "🏛️", // 1442: die Regierung
  "🏛️", // 1443: das Parlament
  "🗳️", // 1444: die Wahl
  "🏷️", // 1445: die Partei
  "🧑", // 1446: der Bürger
  "🗽", // 1447: die Demokratie
  "🏢", // 1448: das Amt
  "🪪", // 1449: der Ausweis
  // 1450: der Personalausweis (checkpoint)
  "🪪", // 1450: der Personalausweis
  "🛂", // 1451: der Reisepass
  "📝", // 1452: das Formular
  "📋", // 1453: der Antrag
  "✅", // 1454: die Genehmigung
  "🏢", // 1455: das Einwohnermeldeamt
  "💸", // 1456: die Steuern
  "🏛️", // 1457: die Behörde

  // === Cat 38: Emergency (1458-1477) ===
  "🚨", // 1458: der Notfall
  "💥", // 1459: der Unfall
  "🆘", // 1460: Hilfe!
  "🔥", // 1461: Feuer!
  "⚠️", // 1462: Vorsicht!
  "❗", // 1463: Achtung!
  "🦹", // 1464: der Dieb
  "🤏", // 1465: stehlen
  "🔥", // 1466: der Brand
  "📞", // 1467: der Notruf
  "🦸", // 1468: retten
  "🩹", // 1469: der Erste-Hilfe-Kasten
  "⚠️", // 1470: die Warnung
  "👁️", // 1471: der Zeuge
  "📋", // 1472: die Anzeige
  "🔓", // 1473: der Einbruch
  "❓", // 1474: vermissen
  "💨", // 1475: der Rauch
  "🚪", // 1476: der Ausgang
  "🏃", // 1477: evakuieren

  // === Cat 39: Classroom (1478-1499) ===
  "🇩🇪", // 1478: Ich lerne Deutsch
  "🗣️", // 1479: Wie sagt man...?
  "❓", // 1480: Was bedeutet das?
  "🐢", // 1481: Bitte langsamer
  "🙋", // 1482: Ich habe eine Frage
  "✅", // 1483: Das ist richtig
  "❌", // 1484: Das ist falsch
  "🤷", // 1485: Ich weiß nicht
  "😓", // 1486: Das ist schwer
  "😌", // 1487: Das ist leicht
  "🔤", // 1488: Buchstabieren Sie bitte
  "🔁", // 1489: Bitte wiederholen
  "📖", // 1490: Seite aufschlagen
  "🧽", // 1491: der Radiergummi
  "📏", // 1492: das Lineal
  "✂️", // 1493: die Schere
  "🧴", // 1494: der Klebstoff
  "☑️", // 1495: ankreuzen
  "📝", // 1496: unterstreichen
  "🧠", // 1497: auswendig lernen
  "📐", // 1498: die Grammatik
  "📖", // 1499: die Vokabel
];

