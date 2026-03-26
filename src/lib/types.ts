export interface Occupation {
  ssyk: string;               // 4-digit SSYK 2012 code
  nameSwedish: string;        // Swedish name
  nameEnglish: string;        // English name
  description?: string;
  descriptionEnglish?: string;
  majorGroup: string;         // SSYK major group (1–9)
  subMajorGroup: string;
  minorGroup: string;
  employed: number;           // Number of employed persons in Sweden (from SCB)
  sector: "public" | "private" | "mixed";
  medianWageSEK?: number;     // Median monthly wage in SEK (from SCB lön statistics if available)
  educationLevel: string;     // Required typical education level

  // Arbetsförmedlingen forecast
  forecast?: {
    outlookScore: number;       // 1–5 mapped from competition level
    competitionLevel: string;   // e.g. "Stor konkurrens", "Balans", "Brist"
    shortTermOutlook: string;   // Swedish text
    mediumTermOutlook: string;
    conceptId?: string | null;
    ingress?: string | null;
  };

  // LLM-generated scores
  scores: {
    theoreticalExposure: number;      // 0–10
    theoreticalExposureRationale: string;
    currentAdoption: number;          // 0–10
    currentAdoptionRationale: string;
    promptUsed: string;               // Exact prompt used — stored for transparency
    modelName: string;                 // e.g. "gpt-4o-mini" — from DB column modelName
    scoredAt: string;                 // ISO timestamp
  };

  // Derived
  quadrant: "high-exposure-high-adoption" | "high-exposure-low-adoption" | "low-exposure-high-adoption" | "low-exposure-low-adoption";
}
