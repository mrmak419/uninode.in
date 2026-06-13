async function getAsinFromUrl(url) {
  try {
    let finalUrl = url;
    if (url.includes("amzn.in") || url.includes("amzn.to")) {
      const headRes = await fetch(url, { 
        method: "GET", 
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      finalUrl = headRes.url;
    }
    console.log("FINAL URL:", finalUrl);
    const match = finalUrl.match(/(?:dp|o|v|asin|product)\/([a-zA-Z0-9]{10})/i);
    return match ? match[1].toUpperCase() : url;
  } catch (err) {
    console.error("Error", err);
    return url;
  }
}

getAsinFromUrl('https://amzn.in/d/06rkCP27').then(console.log);
