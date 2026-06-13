export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    const asin = body.asin;

    if (!asin) {
      return new Response(JSON.stringify({ error: 'Missing ASIN' }), { status: 400 });
    }

    if (!env.AMAZON_CLIENT_ID || !env.AMAZON_CLIENT_SECRET) {
      return new Response(JSON.stringify({ error: 'Amazon Creators API credentials not configured in environment' }), { status: 500 });
    }

    // 1. Get OAuth Access Token
    const tokenParams = new URLSearchParams();
    tokenParams.append('grant_type', 'client_credentials');
    tokenParams.append('client_id', env.AMAZON_CLIENT_ID);
    tokenParams.append('client_secret', env.AMAZON_CLIENT_SECRET);
    tokenParams.append('scope', 'creatorsapi::default');

    const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams.toString()
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      return new Response(JSON.stringify({ error: 'Failed to authenticate with Amazon Creators API', details: errText }), { status: tokenResponse.status });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    async function getAsinFromUrl(url) {
      try {
        let finalUrl = url;
        if (url.includes("amzn.in") || url.includes("amzn.to")) {
          const headRes = await fetch(url, { method: "HEAD", redirect: "follow" });
          finalUrl = headRes.url;
        }
        const match = finalUrl.match(/(?:dp|o|v|asin|product)\/([a-zA-Z0-9]{10})/i);
        return match ? match[1].toUpperCase() : url;
      } catch (err) {
        return url;
      }
    }

    const cleanAsin = await getAsinFromUrl(asin);

    // 2. Fetch Item Details
    const payload = {
      itemIds: [cleanAsin],
      itemIdType: "ASIN",
      resources: [
        "images.primary.large",
        "itemInfo.title",
        "offersV2.listings.price"
      ],
      partnerTag: "kcet_uninode-21",
      partnerType: "Associates"
    };

    const apiResponse = await fetch('https://creatorsapi.amazon/catalog/v1/getItems', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=utf-8',
        'x-marketplace': 'www.amazon.in'
      },
      body: JSON.stringify(payload)
    });

    if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        return new Response(JSON.stringify({ 
          error: 'Amazon API Error', 
          details: errorText,
          fallbackUrl: `https://www.amazon.in/dp/${cleanAsin}?tag=kcet_uninode-21`
        }), { status: apiResponse.status });
    }

    const data = await apiResponse.json();
    
    // Parse the response (Creators API uses camelCase, PA-API used PascalCase)
    const items = data?.itemsResult?.items || data?.ItemsResult?.Items;
    if (!items || items.length === 0) {
        return new Response(JSON.stringify({ error: 'Item not found on Amazon' }), { status: 404 });
    }

    const item = items[0];
    const itemInfo = item.itemInfo || item.ItemInfo;
    const images = item.images || item.Images;
    const offers = item.offersV2 || item.OffersV2 || item.offers || item.Offers;
    
    const title = itemInfo?.title?.displayValue || itemInfo?.Title?.DisplayValue || '';
    const imageUrl = images?.primary?.large?.url || images?.Primary?.Large?.URL || '';
    const priceStr = offers?.listings?.[0]?.price?.displayAmount || offers?.Listings?.[0]?.Price?.DisplayAmount || '';
    const affiliateUrl = item.detailPageURL || item.DetailPageURL || `https://www.amazon.in/dp/${cleanAsin}?tag=kcet_uninode-21`;

    return new Response(JSON.stringify({
        title,
        imageUrl,
        priceHint: priceStr,
        affiliateUrl,
    }), {
        headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
