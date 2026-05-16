import { ReactNode } from "react";

// ─── Server shapes ────────────────────────────────────────────────────────────

export interface ServerJob {
  id: string;
  employerId: string;
  title: string;
  employer: string;
  category: string;
  locationState: string;
  locationAreas: string[];
  requirements: {
    ageRange?: [number, number];
    smartphone?: boolean;
    minCommercial?: number;
    [key: string]: unknown;
  };
  startupCosts: Record<string, number>; // values in kobo
  minimumIncome: number; // kobo
  maximumIncome: number; // kobo
  matchCriteriaWeights: Record<string, number>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServerMatch {
  id: string;
  userId: string;
  jobId: string;
  matchScore: string; // decimal string e.g. "0.42"
  explanation: string[];
  skillBreakdown: Record<
    string,
    { match: boolean; required: number; user_score: number }
  >;
  createdAt: string;
  job: ServerJob;
}

export interface ServerMatchesResponse {
  matches: ServerMatch[];
}

// ─── UI / display shapes (derived from server data + display-only fields) ────

export interface Job {
  // identity
  id: string;
  matchId: string;

  // from server job
  category: string;
  title: string;
  employer: string;
  employerInitials: string; // derived
  employerColor: string;   // display-only (assigned by category/index)
  employerBg: string;      // display-only

  // match
  matchScore: number; // 0–100 integer (server "0.42" → 42)
  whyMatch: string[]; // server explanation[]

  skillBreakdown: ServerMatch["skillBreakdown"];

  // location
  location: string; // derived: "Lagos · Ikeja, Surulere"
  locationState: string;
  locationAreas: string[];

  // arrangement — server doesn't send this; we infer from requirements
  arrangement: string;
  arrangementIcon: string;

  // compensation — server stores in kobo, we store in naira
  compensationMin: number; // naira
  compensationMax: number; // naira

  // startup cost — sum of all startupCosts entries (in naira)
  startupCost: number;
  loanAvailable: boolean; // true when startupCost > 0

  // extra display fields (not from server — populated with sensible defaults/mock)
  description: string;
  skills: string[];
  equipment: string[];
}

// ─── Component props ──────────────────────────────────────────────────────────

export interface CardColor {
  from: string;
  to: string;
}

export interface MatchBadgeProps {
  score: number;
}

export interface PillProps {
  icon: string;
  text: string;
  accent?: boolean;
  highlight?: boolean;
}

export interface SectionProps {
  title: string;
  children: ReactNode;
}

export interface JobDetailProps {
  job: Job;
  onBack?: () => void;
}

export interface SwipeCardProps {
  job: Job;
  index: number;
  isTop: boolean;
  colorIndex: number;
  cardRotation: number;
  onSwiped: () => void;
  onViewDetail: () => void;
}
