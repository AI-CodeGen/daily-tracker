// Service responsible for fetching data from provider (Yahoo Finance style)
import axios from "axios";
import yahooFinance from "yahoo-finance2";
import { createLogger } from "../config/logger.js";
const Logger = createLogger(import.meta.url);

// Decide provider at runtime (default Alpha Vantage). We intentionally DO NOT
// read and cache the API key at module load time because dotenv may not yet be
// initialized when this file is imported. Always read from process.env inside
// the function so a later dotenv.config() call is honored.

// Basic fetch using rapid API style (placeholder) -- adjust with real endpoint or yfinance proxy
export async function fetchQuote(providerSymbol) {
  if (!providerSymbol) {
    Logger.error("During fetchQuote - providerSymbol missing or empty");
    throw new Error("During fetchQuote - providerSymbol missing or empty");
  }
  switch (providerSymbol) {
    case "GOLD":
      return fetchGoldPrice_MoneyControl();
    case "SILVER":
      return fetchSilverPrice_MoneyControl();
    default:
      return fetchMarketQuotes(providerSymbol);
  }
}

export async function fetchMarketQuotes(providerSymbol) {
    const provider = process.env.MARKET_FINANCIAL_DATA_PROVIDER;
    Logger.info(`Using ${provider} to fetch quotes.`);
    if (provider === "YAHOO_FINANCE") {
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
      Logger.info(
        `Yahoo Finance - Result for quote ${providerSymbol} is: ${JSON.stringify(
          result
        )}`
      );
      if (!result) {
        Logger.warn(`Quote ${providerSymbol} not found`);
        throw new Error(`Quote ${providerSymbol} not found`);
      }
      return {
        price: result.regularMarketPrice,
        changePercent: result.regularMarketChangePercent,
        currency: result.currency,
        raw: result,
      };
    } else if (provider === "ALPHA_VANTAGE") {
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
      const { data: resp } = await axios.get(
        "https://www.alphavantage.co/query",
        { params, timeout: 10000 }
      );
      Logger.info(
        `Alpha Vantage - Result for quote ${providerSymbol} is: ${JSON.stringify(
          resp
        )}`
      );
      if (resp.Note) {
        Logger.warn(`Alpha Vantage rate limit / note: ${resp.Note}`);
        throw new Error(`Alpha Vantage rate limit / note: ${resp.Note}`);
      }
      Logger.http(
        `For Symbol ${providerSymbol} - Alpha Vantage response: ${JSON.stringify(
          resp
        )}`
      );
      const quote = resp["Global Quote"];
      if (!quote) {
        Logger.warn(`Quote ${providerSymbol} not found`);
        throw new Error("Quote not found");
      }
      const price = Number(quote["05. price"]);
      // 10. change percent like "1.23%" -> numeric 1.23
      const changePercentRaw = quote["10. change percent"] || "0%";
      const changePercent = parseFloat(
        String(changePercentRaw).replace("%", "")
      );
      return {
        price,
        changePercent,
        raw: quote,
      };
    }
  }

export async function fetchGoldPrice_MoneyControl(date) {
  try {
    // Check if date is present and formatted as YYYY-MM-DD
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Logger.error(`Invalid date format in ${date}, expected YYYY-MM-DD`);
      throw new Error("Invalid date format, expected YYYY-MM-DD");
    }
    // date was not present, take current date formatted as YYYY-MM-DD
    date = new Date(Date.now()).toISOString().slice(0, 10);
    Logger.info(`Checking Gold Price for date: ${date}`);

    let result = await fetch(
      "https://priceapi.moneycontrol.com/pricefeed/mcx/commodityfutures/GOLD?expiry=2025-12-05",
      {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
          "if-none-match": "924D097B0E1954C448B3494B77396E95",
          priority: "u=1, i",
          "sec-ch-ua":
            '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          Referer: "https://www.moneycontrol.com/",
        },
        body: null,
        method: "GET",
      }
    );
    if (!result.ok) {
      Logger.error(
        `MoneyControl Gold API fetch failed with status ${result.status}`
      );
      throw new Error("Failed to fetch gold price from MoneyControl");
    }
    const data = await result.json();
    Logger.info(`MoneyControl Gold API response: ${JSON.stringify(data)}`);

    const price = data.data.avgPrice;
    const unit = data.data.priceUnit;
    const changePercent = parseFloat(data.data.perChange) || 0;
    Logger.info(`Fetched Gold Price from MoneyControl: ${price} per ${unit}`);
    return {
      price,
      unit,
      changePercent,
      raw: data,
    };
  } catch (error) {
    Logger.error(`Error in fetchGoldPrice_MoneyControl: ${error.message}`);
    throw error;
  }
}

export async function fetchSilverPrice_MoneyControl(date) {
  try {
    // Check if date is present and formatted as YYYY-MM-DD
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Logger.error(`Invalid date format in ${date}, expected YYYY-MM-DD`);
      throw new Error("Invalid date format, expected YYYY-MM-DD");
    }
    // date was not present, take current date formatted as YYYY-MM-DD
    date = new Date(Date.now()).toISOString().slice(0, 10);
    Logger.info(`Checking Silver Price for date: ${date}`);

    let result = await fetch(
      `https://priceapi.moneycontrol.com/pricefeed/mcx/commodityfutures/SILVER?expiry=2025-12-05`,
      {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
          "if-none-match": "924D097B0E1954C448B3494B77396E95",
          priority: "u=1, i",
          "sec-ch-ua":
            '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          Referer: "https://www.moneycontrol.com/",
        },
        body: null,
        method: "GET",
      }
    );
    if (!result.ok) {
      Logger.error(
        `MoneyControl Silver API fetch failed with status ${result.status}`
      );
      throw new Error("Failed to fetch silver price from MoneyControl");
    }
    const data = await result.json();
    Logger.info(`MoneyControl Silver API response: ${JSON.stringify(data)}`);

    const price = data.data.avgPrice;
    const unit = data.data.priceUnit;
    const changePercent = parseFloat(data.data.perChange) || 0;
    Logger.info(`Fetched Silver Price from MoneyControl: ${price} per ${unit}`);
    return {
      price,
      unit,
      changePercent,
      raw: data,
    };
  } catch (error) {
    Logger.error(`Error in fetchSilverPrice_MoneyControl: ${error.message}`);
    throw error;
  }
}

export async function MCX_Market_Watch(params) {
  let market_values = await fetch(
    "https://www.mcxindia.com/backpage.aspx/GetMarketWatch",
    {
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "accept-language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/json",
        "sec-ch-ua":
          '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
        cookie:
          "ASP.NET_SessionId=eeom5exrttj4tgml4pypevwh; _gid=GA1.2.910112827.1760453798; _ga=GA1.1.1061824458.1760453798; _ga_8BQ43G0902=GS2.1.s1760455747$o2$g0$t1760455747$j60$l0$h0",
        Referer: "https://www.mcxindia.com/market-data/market-watch",
      },
      body: null,
      method: "POST",
    }
  );
  market_values = await market_values.json();
  Logger.info(
    `MCX Market Watch API response: ${JSON.stringify(market_values)}`
  );
}
