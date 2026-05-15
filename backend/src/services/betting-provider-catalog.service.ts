type BettingProviderCapability = {
  providerCode: "sportybet" | "bet9ja" | "1xbet";
  displayName: string;
  supportedImportFormats: Array<"screenshot" | "csv">;
  notes: string;
};

const capabilities: BettingProviderCapability[] = [
  {
    providerCode: "sportybet",
    displayName: "SportyBet",
    supportedImportFormats: ["screenshot"],
    notes: "No native export. Upload screenshots of your bet history."
  },
  {
    providerCode: "bet9ja",
    displayName: "Bet9ja",
    supportedImportFormats: ["screenshot"],
    notes: "No native export. Upload screenshots of your bet history."
  },
  {
    providerCode: "1xbet",
    displayName: "1xBet",
    supportedImportFormats: ["csv", "screenshot"],
    notes: "Download your history as CSV from 1xBet account settings, or upload screenshots as fallback."
  }
];

export const bettingProviderCatalogService = {
  listProviders() {
    return capabilities;
  }
};
