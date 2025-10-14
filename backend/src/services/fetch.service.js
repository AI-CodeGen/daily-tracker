// Service responsible for fetching data from provider (Yahoo Finance style)
import axios from "axios";
import yahooFinance from "yahoo-finance2";
import Logger from "../config/logger.js";
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

// Decide provider at runtime (default Alpha Vantage). We intentionally DO NOT
// read and cache the API key at module load time because dotenv may not yet be
// initialized when this file is imported. Always read from process.env inside
// the function so a later dotenv.config() call is honored.

export async function fetchGoldPrice_MoneyControl() {
  let browser;
  let page;
  try {
    // Launch a headless browser
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    page = await browser.newPage();

    // Block images to speed up loading
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (req.resourceType() === "image") {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Set a realistic user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    // Navigate to the Moneycontrol page
    const url = "https://www.moneycontrol.com/commodity/gold-price.html";
    await page.goto(url, { waitUntil: "networkidle2" });

    // --- Handle potential cookie consent pop-up ---
    try {
      const cookieButtonSelector = "#wzrk-cancel";
      await page.waitForSelector(cookieButtonSelector, {
        timeout: 5000,
        visible: true,
      });
      await page.click(cookieButtonSelector);
      Logger.info("Dismissed a notification pop-up.");
    } catch (e) {
      Logger.info("No notification pop-up found or it was not clickable.");
    }

    // --- Use a more robust selector strategy: Find by Text ---
    // Use XPath to find a div that contains the text "MCX"
    const mcxHeaderXPath = '//div[contains(text(), "MCX")]';
    await page.waitForXPath(mcxHeaderXPath, { timeout: 15000 });
    const mcxHeaderElements = await page.$x(mcxHeaderXPath);

    if (mcxHeaderElements.length === 0) {
      throw new Error('Could not find the "MCX" header on the page.');
    }

    // Now, get the parent container of that header and find the price within it.
    const data = await mcxHeaderElements[0].evaluate((header) => {
      // Assumption: The header is inside the container that holds the price.
      // Let's traverse up to a common parent, assuming a structure like:
      // <div class="container">
      //   <div>MCX</div>
      //   ...
      //   <div class="price">...</div>
      // </div>
      const container = header.closest(".data_container"); // Adjust if class is different
      if (!container) return null;

      const priceElement = container.querySelector(".price.stprh");
      const priceText = priceElement ? priceElement.innerText : "0";

      const changeElement = container.querySelector(".pricupdn");
      const changeText = changeElement ? changeElement.innerText : "0";

      return { priceText, changeText };
    });

    if (!data) {
      throw new Error(
        "Found MCX header, but could not find price container structure."
      );
    }

    // Parse the extracted text
    const price = parseFloat(data.priceText.replace(/,/g, ""));
    const change = parseFloat(data.changeText);

    if (isNaN(price) || isNaN(change)) {
      Logger.error(
        "Could not parse MCX gold price or change from Moneycontrol"
      );
      throw new Error(
        "Could not parse MCX gold price or change from Moneycontrol"
      );
    }

    // Calculate percentage change
    const previousPrice = price - change;
    const changePercent =
      previousPrice !== 0 ? (change / previousPrice) * 100 : 0;

    Logger.info(
      `Scraped MCX Gold Price: ${price}, Change: ${change}, Change %: ${changePercent.toFixed(
        2
      )}`
    );

    return {
      price: price,
      changePercent: changePercent,
      raw: { price, change },
    };
  } catch (error) {
    Logger.error("Error scraping MCX gold price from Moneycontrol:", error);
    // In case of failure, log the page content for debugging
    if (page) {
      const pageContent = await page.content();
      Logger.debug("Page HTML on failure:", pageContent.substring(0, 2000));
    }
    throw new Error("Failed to fetch MCX gold price from Moneycontrol");
  } finally {
    // Ensure the browser is closed
    if (browser) {
      await browser.close();
    }
  }
}

export async function fetchGoldPrice_GoodReturns() {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const url = "https://www.goodreturns.in/gold-rates/bangalore.html";
    await page.goto(url, { waitUntil: "networkidle2" });

    // Find the table for 24 Carat Gold Rate and extract the price for 1 gram.
    const priceData = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll("table"));
      let price = null;
      for (const table of tables) {
        const header = table.querySelector("thead th");
        if (header && header.innerText.includes("24 CARAT GOLD RATE")) {
          const firstRow = table.querySelector("tbody tr");
          if (firstRow) {
            const priceCell = firstRow.cells[1]; // Second cell for the price
            if (priceCell) {
              price = priceCell.innerText;
              break; // Exit loop once found
            }
          }
        }
      }
      return price;
    });

    if (!priceData) {
      throw new Error("Could not find the 24K gold price table on the page.");
    }

    // Price is in the format "₹ 6,325". We need to parse it.
    const price = parseFloat(priceData.replace(/[^0-9.]/g, ""));

    if (isNaN(price)) {
      throw new Error("Could not parse the gold price from the page.");
    }

    Logger.info(`Scraped Gold Price from GoodReturns: ${price}`);

    // GoodReturns does not easily provide change percentage on this page.
    return {
      price: price,
      changePercent: 0, // Returning 0 as change is not available
      raw: { price },
    };
  } catch (err) {
    Logger.error("Error fetching gold price from GoodReturns:", err.message);
    throw new Error("Failed to fetch gold rate from GoodReturns");
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Basic fetch using rapid API style (placeholder) -- adjust with real endpoint or yfinance proxy
export async function fetchQuote(providerSymbol) {
  if (!providerSymbol) {
    Logger.error("During fetchQuote - providerSymbol missing or empty");
    throw new Error("During fetchQuote - providerSymbol missing or empty");
  }
  if (providerSymbol === "GOLD") {
    // Scrap MoneyControl for MCX Gold Price
    return fetchGoldPrice_GoodReturns();
  } else {
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
}
