/** STYRK-08 four-digit code; field name `ssyk` kept for UI compatibility. */
export interface Occupation {
  ssyk: string;
  /** Norwegian title (alias name retained for minimal UI churn). */
  nameSwedish: string;
  nameEnglish: string;
  description?: string;
  descriptionEnglish?: string;
  majorGroup: string;
  subMajorGroup: string;
  minorGroup: string;
  hierarchy?: {
    major: string;
    subMajor: string;
    minor: string;
    unitGroup: string;
  };
  /** SSB register employment (persons); null if missing/suppressed — never 0 unless official zero. */
  employed: number | null;
  sector: 'public' | 'private' | 'mixed';
  medianWageSEK?: number;
  educationLevel: string;

  forecast?: {
    outlookScore: number;
    competitionLevel: string;
    shortTermOutlook: string;
    mediumTermOutlook: string;
    conceptId?: string | null;
    ingress?: string | null;
  } | null;

  scores: {
    theoreticalExposure: number;
    theoreticalExposureRationale: string;
    currentAdoption: number;
    currentAdoptionRationale: string;
    promptUsed: string;
    modelName: string;
    scoredAt: string;
  } | null;

  quadrant:
    | 'high-exposure-high-adoption'
    | 'high-exposure-low-adoption'
    | 'low-exposure-high-adoption'
    | 'low-exposure-low-adoption'
    | null;

  taxonomySource?: string | null;
  employmentSource?: string | null;
  outlookSource?: string | null;
  scoringSource?: string | null;
}