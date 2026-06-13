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

    // 2. Fetch Item Details
    const payload = {
      ItemIds: [asin],
      ItemIdType: "ASIN",
      Resources: [
        "Images.Primary.Large",
        "ItemInfo.Title",
        "Offers.Listings.Price"
      ],
      PartnerTag: "kcet_uninode-21",
      PartnerType: "Associates",
      Marketplace: "www.amazon.in"
    };

    const apiResponse = await fetch('https://creatorsapi.amazon/catalog/v1/getItems', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        return new Response(JSON.stringify({ error: 'Amazon API Error', details: errorText }), { status: apiResponse.status });
    }

    const data = await apiResponse.json();
    
    // Parse the response
    const items = data?.ItemsResult?.Items;
    if (!items || items.length === 0) {
        return new Response(JSON.stringify({ error: 'Item not found on Amazon' }), { status: 404 });
    }

    const item = items[0];
    const title = item.ItemInfo?.Title?.DisplayValue || '';
    const imageUrl = item.Images?.Primary?.Large?.URL || '';
    const priceStr = item.Offers?.Listings?.[0]?.Price?.DisplayAmount || '';
    const affiliateUrl = item.DetailPageURL || `https://www.amazon.in/dp/${asin}?tag=kcet_uninode-21`;

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
