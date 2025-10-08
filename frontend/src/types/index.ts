export interface Asset {
  _id: string;
  name: string;
  symbol: string;
  providerSymbol: string;
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
  changePercent?: number;
  takenAt: string;
}
