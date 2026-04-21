
async function findChannelId() {
  try {
    const url = 'https://www.youtube.com/@Gaurav-Arora';
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });
    const text = await response.text();
    // Try multiple regexes
    const m1 = text.match(/"channelId":"(UC[^"]+)"/);
    const m2 = text.match(/itemprop="channelId" content="(UC[^"]+)"/);
    const m3 = text.match(/youtube\.com\/channel\/(UC[^"]+)"/);
    
    console.log('M1:', m1 ? m1[1] : 'Not found');
    console.log('M2:', m2 ? m2[1] : 'Not found');
    console.log('M3:', m3 ? m3[1] : 'Not found');
  } catch (e) {
    console.error(e);
  }
}

findChannelId();
