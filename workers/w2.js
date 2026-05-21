export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const symbol = url.searchParams.get('symbol');
    const region = url.searchParams.get('region');

    // Helper for consistent responses
    const sendResponse = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=60",
        },
      });
    };

    // Helper for API calls with timeout
    const fetchWithTimeout = async (url, options, timeout = 5000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
      } catch (error) {
        clearTimeout(id);
        throw error;
      }
    };

    try {
      let data;

      // ==================== COMMODITIES ====================
      if (type === 'commodity') {
        const commodities = "XAU,XAG,WTIOIL-FUT,BRENTOIL-FUT";
        const apiUrl = `https://api.commoditypriceapi.com/v2/rates/latest?symbols=${commodities}`;
        
        const response = await fetchWithTimeout(apiUrl, {
          headers: { "X-API-Key": env.COMMODITY_API_KEY }
        });
        
        if (!response.ok) throw new Error(`Commodity API: ${response.status}`);
        data = await response.json();
      }

      // ==================== STOCKS (iTick) ====================
      else if (type === 'stock' && symbol && region) {
        const apiUrl = `https://api0.itick.org/stock/quote`;
        const params = new URLSearchParams({ region, code: symbol });
        
        const response = await fetchWithTimeout(`${apiUrl}?${params}`, {
          headers: { "token": env.ITICK_TOKEN }
        });
        
        if (!response.ok) throw new Error(`iTick API: ${response.status}`);
        
        const stockData = await response.json();

        if (stockData.code === 0 && stockData.data) {
          const quote = stockData.data;
          data = {
            symbol: quote.s,
            price: quote.ld,
            change: quote.chp,
            high: quote.h,
            low: quote.l,
            volume: quote.v,
            region: region,
            timestamp: Date.now()
          };
        } else {
          throw new Error(stockData.msg || 'No data from iTick');
        }
      }

      else {
        return sendResponse({
          error: "Invalid request",
          valid_requests: [
            "?type=commodity",
            "?type=stock&region=US&symbol=AAPL",
            "?type=stock&region=MY&symbol=MAYBANK"
          ]
        }, 400);
      }

      return sendResponse(data);

    } catch (error) {
      console.error(`Worker error: ${error.message}`);
      
      return sendResponse({
        error: "Failed to fetch data",
        message: error.message,
        hint: "Check API keys or try again later"
      }, 500);
    }
  },
};
