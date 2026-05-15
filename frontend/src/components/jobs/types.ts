import { ReactNode } from "react";

export interface Job {
  id: number;
  category: string;
  title: string;
  employer: string;
  employerInitials: string;
  employerColor: string;
  employerBg: string;
  matchScore: number;
  location: string;
  arrangement: string;
  arrangementIcon: string;
  compensationMin: number;
  compensationMax: number;
  period: string;
  description: string;
  skills: string[];
  equipment: string[];
  startupCost: number;
  loanAvailable: boolean;
  whyMatch: string[];
}

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
  onSwiped: () => void;
  onViewDetail: () => void;
}