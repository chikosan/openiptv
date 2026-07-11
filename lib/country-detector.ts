/**
 * Country Detection and Organization Utilities
 */

export interface CountryInfo {
  code: string; // ISO code like "IL", "US", "UK"
  name: string; // Full name like "Israel", "United States"
  flag: string; // Emoji flag
}

// Country keywords for detection
const COUNTRY_PATTERNS: Record<string, CountryInfo> = {
  // Middle East
  IL: { code: "IL", name: "Israel", flag: "🇮🇱" },
  PS: { code: "PS", name: "Palestine", flag: "🇵🇸" },
  LB: { code: "LB", name: "Lebanon", flag: "🇱🇧" },
  JO: { code: "JO", name: "Jordan", flag: "🇯🇴" },
  SY: { code: "SY", name: "Syria", flag: "🇸🇾" },
  IQ: { code: "IQ", name: "Iraq", flag: "🇮🇶" },
  SA: { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  AE: { code: "AE", name: "UAE", flag: "🇦🇪" },
  EG: { code: "EG", name: "Egypt", flag: "🇪🇬" },
  IR: { code: "IR", name: "Iran", flag: "🇮🇷" },

  // Europe
  UK: { code: "UK", name: "United Kingdom", flag: "🇬🇧" },
  FR: { code: "FR", name: "France", flag: "🇫🇷" },
  DE: { code: "DE", name: "Germany", flag: "🇩🇪" },
  IT: { code: "IT", name: "Italy", flag: "🇮🇹" },
  ES: { code: "ES", name: "Spain", flag: "🇪🇸" },
  PT: { code: "PT", name: "Portugal", flag: "🇵🇹" },
  NL: { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  BE: { code: "BE", name: "Belgium", flag: "🇧🇪" },
  GR: { code: "GR", name: "Greece", flag: "🇬🇷" },
  TR: { code: "TR", name: "Turkey", flag: "🇹🇷" },
  SE: { code: "SE", name: "Sweden", flag: "🇸🇪" },
  NO: { code: "NO", name: "Norway", flag: "🇳🇴" },
  DK: { code: "DK", name: "Denmark", flag: "🇩🇰" },
  FI: { code: "FI", name: "Finland", flag: "🇫🇮" },
  AT: { code: "AT", name: "Austria", flag: "🇦🇹" },
  CH: { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  PL: { code: "PL", name: "Poland", flag: "🇵🇱" },
  RO: { code: "RO", name: "Romania", flag: "🇷🇴" },
  UA: { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  HU: { code: "HU", name: "Hungary", flag: "🇭🇺" },
  BG: { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
  RS: { code: "RS", name: "Serbia", flag: "🇷🇸" },
  HR: { code: "HR", name: "Croatia", flag: "🇭🇷" },
  AL: { code: "AL", name: "Albania", flag: "🇦🇱" },

  // Americas
  US: { code: "US", name: "United States", flag: "🇺🇸" },
  CA: { code: "CA", name: "Canada", flag: "🇨🇦" },
  MX: { code: "MX", name: "Mexico", flag: "🇲🇽" },
  BR: { code: "BR", name: "Brazil", flag: "🇧🇷" },
  AR: { code: "AR", name: "Argentina", flag: "🇦🇷" },

  // Asia
  IN: { code: "IN", name: "India", flag: "🇮🇳" },
  CN: { code: "CN", name: "China", flag: "🇨🇳" },
  JP: { code: "JP", name: "Japan", flag: "🇯🇵" },
  KR: { code: "KR", name: "South Korea", flag: "🇰🇷" },
  PK: { code: "PK", name: "Pakistan", flag: "🇵🇰" },

  // Other
  AU: { code: "AU", name: "Australia", flag: "🇦🇺" },
  RU: { code: "RU", name: "Russia", flag: "🇷🇺" },
  IE: { code: "IE", name: "Ireland", flag: "🇮🇪" },
  MA: { code: "MA", name: "Morocco", flag: "🇲🇦" },
  NZ: { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
};

// Keywords for each country. Short (<=3 char) entries are ISO-style codes and are
// ONLY trusted as the leading segment of a group-title (the "US ▎Sports",
// "DE ▎Kids" convention nearly every IPTV panel uses) — matching them as a
// substring anywhere in free text used to produce garbage (e.g. "CH" inside
// "Channel", "IT" inside "City"). Longer entries are real words and are matched
// as a whole token anywhere in the name or group.
const COUNTRY_KEYWORDS: Record<string, string[]> = {
  IL: ["israel", "israeli", "hebrew", "עברית", "ישראל", "il", "isr"],
  PS: ["palestine", "palestinian", "فلسطين", "ps"],
  LB: ["lebanon", "lebanese", "لبنان", "lb"],
  JO: ["jordan", "jordanian", "الأردن", "jo"],
  SY: ["syria", "syrian", "سوريا", "sy"],
  IQ: ["iraq", "iraqi", "العراق", "iq"],
  SA: ["saudi", "السعودية", "ksa", "sa"],
  AE: ["uae", "emirates", "الإمارات", "dubai", "ae"],
  EG: ["egypt", "egyptian", "مصر", "eg"],
  IR: ["iran", "iranian", "persian", "ir"],

  UK: ["united kingdom", "british", "england", "uk", "gb"],
  FR: ["france", "french", "français", "fr"],
  DE: ["germany", "german", "deutsch", "de"],
  IT: ["italy", "italian", "italiano", "it"],
  ES: ["spain", "spanish", "español", "es"],
  PT: ["portugal", "portuguese", "pt"],
  NL: ["netherlands", "dutch", "nl"],
  BE: ["belgium", "belgian", "be"],
  GR: ["greece", "greek", "gr"],
  TR: ["turkey", "turkish", "türk", "tr"],
  SE: ["sweden", "swedish", "se"],
  NO: ["norway", "norwegian", "no"],
  DK: ["denmark", "danish", "dk"],
  FI: ["finland", "finnish", "fi"],
  AT: ["austria", "austrian", "at"],
  CH: ["switzerland", "swiss", "ch"],
  PL: ["poland", "polish", "pl"],
  RO: ["romania", "romanian", "ro"],
  UA: ["ukraine", "ukrainian", "ua"],
  HU: ["hungary", "hungarian", "hu"],
  BG: ["bulgaria", "bulgarian", "bg"],
  RS: ["serbia", "serbian", "rs"],
  HR: ["croatia", "croatian", "hr"],
  AL: ["albania", "albanian", "al"],

  US: ["usa", "united states", "american", "america", "us"],
  CA: ["canada", "canadian", "ca"],
  MX: ["mexico", "mexican", "mx"],
  BR: ["brazil", "brazilian", "brasil", "br"],
  // No bare "ar" — IPTV panels overwhelmingly use AR for the Arabic-language
  // bucket (bein Sports, pan-Arab entertainment...), not Argentina. Panels that
  // do mean Argentina disambiguate with "ARG" instead, which we trust.
  AR: ["argentina", "argentinian", "arg"],

  IN: ["india", "indian", "in"],
  CN: ["china", "chinese", "中国", "cn"],
  JP: ["japan", "japanese", "日本", "jp"],
  KR: ["korea", "korean", "한국", "kr"],
  PK: ["pakistan", "pakistani", "pk"],

  AU: ["australia", "australian", "aussie", "au"],
  RU: ["russia", "russian", "русский", "ru"],
  IE: ["ireland", "irish", "ie"],
  MA: ["morocco", "moroccan", "المغرب", "ma"],
  NZ: ["new zealand", "nz"],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/**
 * Detect country from channel name or group
 */
export function detectCountry(channelName: string, group?: string): CountryInfo | null {
  const groupText = group || "";
  const nameTokens = tokenize(channelName);
  const groupTokens = tokenize(groupText);
  const nameTokenSet = new Set(nameTokens);
  const groupTokenSet = new Set(groupTokens);
  // Space-padded so multi-word keywords ("new zealand") can be matched as a
  // whole phrase without a false hit on "zealand" alone matching partway through.
  const paddedText = ` ${nameTokens.join(" ")} ${groupTokens.join(" ")} `;
  const leadingToken = groupTokens[0] ?? (groupText.trim() ? undefined : nameTokens[0]);

  for (const [countryCode, keywords] of Object.entries(COUNTRY_KEYWORDS)) {
    for (const keyword of keywords) {
      const kw = keyword.toLowerCase();

      if (kw.length <= 3) {
        if (leadingToken === kw) {
          return COUNTRY_PATTERNS[countryCode];
        }
      } else if (kw.includes(" ")) {
        if (paddedText.includes(` ${kw} `)) {
          return COUNTRY_PATTERNS[countryCode];
        }
      } else if (nameTokenSet.has(kw) || groupTokenSet.has(kw)) {
        return COUNTRY_PATTERNS[countryCode];
      }
    }
  }

  return null;
}

/**
 * Get country info by code
 */
export function getCountryInfo(code: string): CountryInfo | null {
  return COUNTRY_PATTERNS[code.toUpperCase()] || null;
}

/**
 * Get all available countries
 */
export function getAllCountries(): CountryInfo[] {
  return Object.values(COUNTRY_PATTERNS);
}

/**
 * Group channels by country
 */
export function groupChannelsByCountry<T extends { name: string; group?: string }>(
  channels: T[],
): Record<string, { country: CountryInfo; channels: T[] }> {
  const grouped: Record<string, { country: CountryInfo; channels: T[] }> = {};
  const uncategorized: T[] = [];

  for (const channel of channels) {
    const country = detectCountry(channel.name, channel.group);

    if (country) {
      if (!grouped[country.code]) {
        grouped[country.code] = {
          country,
          channels: [],
        };
      }
      grouped[country.code].channels.push(channel);
    } else {
      uncategorized.push(channel);
    }
  }

  // Add uncategorized if any
  if (uncategorized.length > 0) {
    grouped["OTHER"] = {
      country: { code: "OTHER", name: "Other", flag: "🌍" },
      channels: uncategorized,
    };
  }

  return grouped;
}

/**
 * Sort countries alphabetically but keep certain ones at top
 */
export function sortCountries(
  grouped: Record<string, { country: CountryInfo; channels: any[] }>,
  priorityCountries: string[] = ["IL", "US", "UK"],
): Array<{ country: CountryInfo; channels: any[] }> {
  const entries = Object.entries(grouped);

  const priority: Array<{ country: CountryInfo; channels: any[] }> = [];
  const regular: Array<{ country: CountryInfo; channels: any[] }> = [];

  for (const [code, data] of entries) {
    if (code === "OTHER") {
      continue; // Handle separately
    } else if (priorityCountries.includes(code)) {
      priority.push(data);
    } else {
      regular.push(data);
    }
  }

  // Sort priority by priority order
  priority.sort((a, b) => {
    const aIndex = priorityCountries.indexOf(a.country.code);
    const bIndex = priorityCountries.indexOf(b.country.code);
    return aIndex - bIndex;
  });

  // Sort regular alphabetically
  regular.sort((a, b) => a.country.name.localeCompare(b.country.name));

  // Combine: priority first, then regular, then other
  const result = [...priority, ...regular];
  if (grouped["OTHER"]) {
    result.push(grouped["OTHER"]);
  }

  return result;
}
