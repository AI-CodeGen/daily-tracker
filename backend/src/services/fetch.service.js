// Service responsible for fetching data from provider (Yahoo Finance style)
import axios from "axios";

// Decide provider at runtime (default Alpha Vantage). We intentionally DO NOT
// read and cache the API key at module load time because dotenv may not yet be
// initialized when this file is imported. Always read from process.env inside
// the function so a later dotenv.config() call is honored.
const provider = process.env.FINANCIAL_DATA_PROVIDER || "ALPHA_VANTAGE";

// Basic fetch using rapid API style (placeholder) -- adjust with real endpoint or yfinance proxy
export async function fetchQuote(providerSymbol) {
  if (provider === "YAHOO_FINANCE") {
    // For simplicity using public Yahoo query1 endpoint (no API key) - subject to rate limits
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
  } else if (provider === "ALPHA_VANTAGE") {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) throw new Error("ALPHA_VANTAGE_API_KEY missing");
    const params = {
      function: "GLOBAL_QUOTE",
      symbol: providerSymbol,
      apikey: apiKey,
    };
    const { data: resp } = await axios.get("https://www.alphavantage.co/query", { params, timeout: 10000 });
    if (resp.Note) {
      throw new Error(`Alpha Vantage rate limit / note: ${resp.Note}`);
    }
    console.log(`For Symbol ${providerSymbol} - Alpha Vantage response: ${JSON.stringify(resp)}`);
    const quote = resp["Global Quote"];
    if (!quote) throw new Error("Quote not found");
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
