type BettingProviderCapability = {
  providerCode: "sportybet" | "bet9ja" | "nairabet";
  displayName: string;
  publicApiAvailable: boolean;
  accountHistoryVisibleInProduct: boolean;
  supportedImportFormats: Array<"csv" | "json">;
  browserAssistedCollection: boolean;
  notes: string;
};

const capabilities: BettingProviderCapability[] = [
  {
    providerCode: "sportybet",
    displayName: "SportyBet",
    publicApiAvailable: false,
    accountHistoryVisibleInProduct: true,
    supportedImportFormats: ["csv", "json"],
    browserAssistedCollection: true,
    notes: "No public developer API verified; best current path is provider export/import or user-consented browser collection."
  },
  {
    providerCode: "bet9ja",
    displayName: "Bet9ja",
    publicApiAvailable: false,
    accountHistoryVisibleInProduct: true,
    supportedImportFormats: ["csv", "json"],
    browserAssistedCollection: true,
    notes: "Official help confirms My Bets and Transaction History visibility, but no public developer API was verified."
  },
  {
    providerCode: "nairabet",
    displayName: "Nairabet",
    publicApiAvailable: false,
    accountHistoryVisibleInProduct: true,
    supportedImportFormats: ["csv", "json"],
    browserAssistedCollection: true,
    notes: "Official product pages show Open Bets access, but no public developer API was verified."
  }
];

export const bettingProviderCatalogService = {
  listProviders() {
    return capabilities;
  }
};
