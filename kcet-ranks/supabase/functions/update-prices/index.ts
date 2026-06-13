import { createClient } from "npm:@supabase/supabase-js@2.45.0";

// Standard Deno fetch handler
export default {
  async fetch(req: Request) {
    console.log("Starting Amazon price update cron job...");

    // 1. Verify Authentication
    // The cron job must pass the service_role key as Bearer token
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!authHeader || !serviceRoleKey || !authHeader.includes(serviceRoleKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // 2. Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 3. Fetch all products
    const { data: products, error } = await supabase.from("gear_products").select("*");
    
    if (error || !products) {
      console.error("Failed to fetch products:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch products" }), { status: 500 });
    }

    if (products.length === 0) {
      return new Response(JSON.stringify({ message: "No products to update." }), { status: 200 });
    }

    // 4. Authenticate with Amazon Creators API
    const clientId = Deno.env.get("AMAZON_CLIENT_ID");
    const clientSecret = Deno.env.get("AMAZON_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      console.error("Missing Amazon keys");
      return new Response(JSON.stringify({ error: "Missing Amazon keys" }), { status: 500 });
    }

    const tokenParams = new URLSearchParams();
    tokenParams.append("grant_type", "client_credentials");
    tokenParams.append("client_id", clientId);
    tokenParams.append("client_secret", clientSecret);
    tokenParams.append("scope", "creatorsapi::default");

    const tokenRes = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      console.error("Amazon token failed:", await tokenRes.text());
      return new Response(JSON.stringify({ error: "Amazon token failed" }), { status: 500 });
    }

    const { access_token } = await tokenRes.json();

    // 5. Helper function to extract ASIN from URL (following redirects for amzn.in)
    async function getAsinFromUrl(url: string): Promise<string | null> {
      try {
        let finalUrl = url;
        if (url.includes("amzn.in") || url.includes("amzn.to")) {
          // Follow redirect
          const headRes = await fetch(url, { method: "HEAD", redirect: "follow" });
          finalUrl = headRes.url;
        }

        const match = finalUrl.match(/(?:dp|o|v|asin|product)\/([a-zA-Z0-9]{10})/i);
        return match ? match[1].toUpperCase() : null;
      } catch (err) {
        console.error("Failed to extract ASIN for", url, err);
        return null;
      }
    }

    // 6. Process products and update prices
    let updatedCount = 0;
    const errors: string[] = [];

    // Process in smaller batches if necessary (Amazon allows up to 50 ItemIds per request)
    // For simplicity, we loop them and build batches of 10.
    const batchSize = 10;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      const asinsToFetch: string[] = [];
      const asinToProductId: Record<string, string> = {};

      for (const product of batch) {
        const asin = await getAsinFromUrl(product.affiliate_url);
        if (asin) {
          asinsToFetch.push(asin);
          asinToProductId[asin] = product.id;
        } else {
          console.warn("Could not find ASIN for product:", product.name);
        }
      }

      if (asinsToFetch.length === 0) continue;

      // Ping Amazon API
      const payload = {
        ItemIds: asinsToFetch,
        ItemIdType: "ASIN",
        Resources: ["Offers.Listings.Price"],
        PartnerTag: "kcet_uninode-21",
        PartnerType: "Associates",
        Marketplace: "www.amazon.in",
      };

      const apiRes = await fetch("https://creatorsapi.amazon.com/catalog/v1/getItems", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      if (!apiRes.ok) {
        errors.push(`Amazon API Error batch ${i}: ${await apiRes.text()}`);
        continue;
      }

      const data = await apiRes.json();
      const items = data?.ItemsResult?.Items || [];

      // Update Database
      for (const item of items) {
        const asin = item.ASIN;
        const priceStr = item.Offers?.Listings?.[0]?.Price?.DisplayAmount;
        
        if (asin && priceStr) {
          const productId = asinToProductId[asin];
          const { error: updateError } = await supabase
            .from("gear_products")
            .update({ price_hint: priceStr })
            .eq("id", productId);

          if (!updateError) {
            updatedCount++;
          } else {
            console.error("Supabase update failed for", asin, updateError);
          }
        }
      }
    }

    console.log(`Successfully updated ${updatedCount} product prices.`);

    return new Response(
      JSON.stringify({
        message: "Update complete",
        updatedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  },
};
