// Service responsible for fetching data from provider (Yahoo Finance style)
import axios from "axios";
import yahooFinance from 'yahoo-finance2';
import Logger from '../config/logger.js';

// Decide provider at runtime (default Alpha Vantage). We intentionally DO NOT
// read and cache the API key at module load time because dotenv may not yet be
// initialized when this file is imported. Always read from process.env inside
// the function so a later dotenv.config() call is honored.
let provider = process.env.FINANCIAL_DATA_PROVIDER;

// Basic fetch using rapid API style (placeholder) -- adjust with real endpoint or yfinance proxy
export async function fetchQuote(providerSymbol) {
  if (process.env.FINANCIAL_DATA_PROVIDER === "YAHOO_FINANCE") {
    // For simplicity using public Yahoo query1 endpoint (no API key) - subject to rate limits
    /* OLD IMPLEMENTATION using axios
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
      providerSymbol
    )}`;
    const { data } = await axios.get(url, { timeout: 10000 });
    const result = data?.quoteResponse?.result?.[0];
    if (!result) throw new Error("Quote not found");
    return {
      price: result.regularMarketPrice,
      changePercent: result.regularMarketChangePercent,
      raw: result,
    };
    */
   // NEW IMPLEMENTATION using yahoo-finance2 package
    const result = await yahooFinance.quote(providerSymbol);
    if (!result) {
      Logger.warn(`Quote ${providerSymbol} not found`);
      throw new Error(`Quote ${providerSymbol} not found`);
    }
    return {
      price: result.regularMarketPrice,
      changePercent: result.regularMarketChangePercent,
      raw: result,
    };
  } else if (process.env.FINANCIAL_DATA_PROVIDER === "ALPHA_VANTAGE") {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      Logger.error("ALPHA_VANTAGE_API_KEY missing");
      throw new Error("ALPHA_VANTAGE_API_KEY missing");
    }
    const params = {
      function: "GLOBAL_QUOTE",
      symbol: providerSymbol,
      apikey: apiKey,
    };
    const { data: resp } = await axios.get("https://www.alphavantage.co/query", { params, timeout: 10000 });
    if (resp.Note) {
      Logger.warn(`Alpha Vantage rate limit / note: ${resp.Note}`);
      throw new Error(`Alpha Vantage rate limit / note: ${resp.Note}`);
    }
    Logger.http(`For Symbol ${providerSymbol} - Alpha Vantage response: ${JSON.stringify(resp)}`);
    const quote = resp["Global Quote"];
    if (!quote) {
      Logger.warn(`Quote ${providerSymbol} not found`);
      throw new Error("Quote not found");
    }
    const price = Number(quote["05. price"]);
    // 10. change percent like "1.23%" -> numeric 1.23
    const changePercentRaw = quote["10. change percent"] || "0%";
    const changePercent = parseFloat(String(changePercentRaw).replace("%", ""));
    return {
      price,
      changePercent,
      raw: quote,
    };
  }
}
