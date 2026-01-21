
export const config = { runtime: 'edge' };

type Offer = {
  source: 'Apple Books' | 'Google Play Books';
  format: 'ebook' | 'audiobook';
  price?: { amount: number; currency: string };
  link: string;
  title?: string;
};

type BookMeta = {
  title?: string;
  authors?: string[];
  publisher?: string;
  year?: number;
  cover?: { small?: string; large?: string };
  isbn13?: string;
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const rawIsbn = (url.searchParams.get('isbn') || '').trim();
  const q = (url.searchParams.get('q') || '').trim();
  const country = 'US';

  if (!rawIsbn && !q) {
    return json({ error: 'Provide ?isbn=978... or ?q=keyword' }, 400);
  }

  const isbn = rawIsbn ? toIsbn13(rawIsbn) : '';

  const [appleEbooks, appleAudio, gbooks, meta] = await Promise.all([
    fetchApple(isbn || q, 'ebook', country),
    fetchApple(isbn || q, 'audiobook', country),
    fetchGoogleBooks(isbn, country),
    fetchOpenLibraryMeta(isbn)
  ]);

  const offers: Offer[] = [...appleEbooks, ...appleAudio, ...gbooks].sort((a, b) => {
    const pa = a.price?.amount ?? Number.POSITIVE_INFINITY;
    const pb = b.price?.amount ?? Number.POSITIVE_INFINITY;
    return pa - pb;
  });

  const physicalLinks = buildPhysicalLinks(isbn || q);

  return json({
    query: { isbn: isbn || null, q: q || null },
    book: meta,
    offers,
    physicalLinks,
    ts: new Date().toISOString()
  }, 200, { "Cache-Control": "s-maxage=600, stale-while-revalidate=60" });
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign({ "content-type": "application/json; charset=utf-8" }, extraHeaders)
  });
}

function toIsbn13(input: string): string {
  const digits = input.replace(/[^0-9Xx]/g, '');
  if (digits.length === 13) return digits;
  if (digits.length !== 10) return digits;
  const core = '978' + digits.substring(0, 9);
  const sum = core.split('').map((d, i) => parseInt(d, 10) * (i % 2 === 0 ? 1 : 3)).reduce((a, b) => a + b, 0);
  const check = (10 - (sum % 10)) % 10;
  return core + String(check);
}

async function fetchApple(term: string, kind: 'ebook' | 'audiobook', country: string): Promise<Offer[]> {
  if (!term) return [];
  const params = new URLSearchParams({
    country,
    media: kind === 'ebook' ? 'ebook' : 'audiobook',
    entity: kind === 'ebook' ? 'ebook' : 'audiobook',
    term
  });
  const res = await fetch(`https://itunes.apple.com/search?${params.toString()}`);
  if (!res.ok) return [];
  const json: any = await res.json();
  const results = Array.isArray(json.results) ? json.results : [];
  return results.map((r: any) => ({
    source: 'Apple Books',
    format: kind,
    price: r.trackPrice ? { amount: r.trackPrice, currency: r.currency || 'USD' } : undefined,
    link: r.trackViewUrl,
    title: r.trackName
  }));
}

async function fetchGoogleBooks(isbn13: string, country: string): Promise<Offer[]> {
  if (!isbn13) return [];
  const params = new URLSearchParams({
    q: `isbn:${isbn13}`,
    country,
    maxResults: '10'
  });
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
  if (!res.ok) return [];
  const json: any = await res.json();
  const items = Array.isArray(json.items) ? json.items : [];
  return items
    .filter((it: any) => it.saleInfo?.saleability === 'FOR_SALE' && it.saleInfo?.retailPrice?.amount)
    .map((it: any) => ({
      source: 'Google Play Books',
      format: 'ebook',
      price: {
        amount: it.saleInfo.retailPrice.amount,
        currency: it.saleInfo.retailPrice.currencyCode || 'USD'
      },
      link: it.saleInfo?.buyLink || it.volumeInfo?.infoLink,
      title: it.volumeInfo?.title
    }));
}

async function fetchOpenLibraryMeta(isbn13: string): Promise<BookMeta> {
  if (!isbn13) return {};
  const res = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn13}&format=json&jscmd=data`
  );
  if (!res.ok) return { isbn13 };
  const json: any = await res.json();
  const data = json[`ISBN:${isbn13}`] || {};
  const title = data.title;
  const authors = Array.isArray(data.authors) ? data.authors.map((a: any) => a.name) : undefined;
  const publishers = Array.isArray(data.publishers) ? data.publishers.map((p: any) => p.name) : undefined;
  const publish_date = data.publish_date;
  const cover = {
    small: `https://covers.openlibrary.org/b/isbn/${isbn13}-M.jpg`,
    large: `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg`
  };
  return {
    isbn13,
    title,
    authors,
    publisher: publishers?.[0],
    year: parseInt((publish_date || '').slice(-4), 10) || undefined,
    cover
  };
}

function buildPhysicalLinks(query: string) {
  const q = encodeURIComponent(query);
  return {
    amazon: `https://www.amazon.com/s?k=${q}`,
    abebooks: `https://www.abebooks.com/servlet/SearchResults?isbn=${q}`,
    thriftbooks: `https://www.thriftbooks.com/browse/?b.search=${q}`,
    alibris: `https://www.alibris.com/search/books/isbn/${q}`,
    ebay: `https://www.ebay.com/sch/i.html?_nkw=${q}`
  };
}
