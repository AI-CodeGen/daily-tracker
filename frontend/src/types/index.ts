export interface Asset {
  _id: string;
  name: string;
  symbol: string;
  providerSymbol: string;
  unit?: string;
  currency?: string;
  upperThreshold?: number;
  lowerThreshold?: number;
  lastAlertedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuoteSnapshot {
  assetId: string;
  symbol: string;
  name: string;
  price: number;
  currency?: string;
  changePercent?: number;
  unit?: string;
  takenAt: string;
}
