export interface User {
  _id: string;
  name: string;
  email: string;
}

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
  userId?: User;
  isGlobal?: boolean;
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
