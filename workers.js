
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

    try {
      let data;

      // ==================== COMMODITIES ====================
      if (type === 'commodity') {
        const commodities = "XAU,XAG,WTIOIL-FUT,BRENTOIL-FUT";
        const apiUrl = `https://api.commoditypriceapi.com/v2/rates/latest?symbols=${commodities}`;
        const response = await fetch(apiUrl, {
          headers: { "X-API-Key": env.COMMODITY_API_KEY }
        });
        data = await response.json();
      }

      // ==================== STOCKS (iTick) ====================
      else if (type === 'stock' && symbol && region) {
        const apiUrl = `https://api0.itick.org/stock/quote`;
        const params = new URLSearchParams({ region, code: symbol });
        const response = await fetch(`${apiUrl}?${params}`, {
          headers: { "token": env.ITICK_TOKEN }
        });

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
            region: region
          };
        } else {
          throw new Error(stockData.msg || 'No data');
        }
      }

      else {
        return new Response(JSON.stringify({
          error: "Use ?type=commodity OR ?type=stock&region=US&symbol=AAPL OR ?type=stock&region=MY&symbol=MAYBANK"
        }), { status: 400 });
      }

      return new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
```

//**Note:** This script references two secret environment variables
//— `COMMODITY_API_KEY` and `ITICK_TOKEN` 
//— which are not included in the download. Make sure you also back up those values separately if needed.

