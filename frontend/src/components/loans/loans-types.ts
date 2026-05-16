export type StartupCosts = Record<string, number>;

export type LoanOffer = {
  jobId: string;
  jobTitle: string;
  amount: number;           // kobo
  termMonths: number;
  interestRateBps: number;  // 350 = 3.5%
  monthlyRepayment: number; // kobo
  eligible: boolean;
  policyReason: string;
  disbursementDestination: string;
  startupCosts: StartupCosts;
};
