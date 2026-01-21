
import { useState } from 'react'
import Scanner from './components/Scanner'

type Offer = { source:string; format:'ebook'|'audiobook'; price?:{amount:number; currency:string}; link:string; title?:string; }
type BookMeta = { title?:string; authors?:string[]; publisher?:string; year?:number; cover?:{small?:string; large?:string}; isbn13?:string }

export default function App() {
  const [isbn, setIsbn] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [data, setData] = useState<{ book?:BookMeta; offers?:Offer[]; physicalLinks?:Record<string,string> }|null>(null)

  async function runSearch(nextIsbnOrQuery: string) {
    if (!nextIsbnOrQuery) return
    setLoading(true); setError(null); setData(null)
    try {
      const param = nextIsbnOrQuery.match(/^\d{10,13}$/) ? 'isbn' : 'q'
      const res = await fetch(`/api/search?${param}=${encodeURIComponent(nextIsbnOrQuery)}`)
      if (!res.ok) throw new Error(`API ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (e:any) {
      setError(e.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 720, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
        <img src="/logo.svg" alt="ScanMyBook logo" width={160} height={40} />
      </header>
      <h1>ScanMyBook</h1>
      <p>Scan a barcode or type an ISBN/title to compare digital prices. Physical stores are linked out.</p>
      <section>
        <Scanner onDetected={runSearch} />
        <form onSubmit={(e)=>{e.preventDefault(); runSearch(isbn)}} style={{ display:'flex', gap:8, marginTop:12 }}>
          <input
            placeholder="ISBN-13 or title"
            value={isbn}
            onChange={(e)=>setIsbn(e.target.value)}
            aria-label="Search by ISBN or title"
            style={{ flex:1, padding:'8px 10px', border:'1px solid #ccc', borderRadius:8 }}
          />
          <button type="submit" style={{ padding:'8px 12px', borderRadius:8 }}>Search</button>
        </form>
      </section>
      {loading && <p>Loading…</p>}
      {error && <p role="alert" style={{ color: 'crimson' }}>{error}</p>}

      {data && (
        <>
          <section style={{ marginTop: 16 }}>
            {data.book?.cover?.small && <img src={data.book.cover.small} alt="" style={{ float:'right', width:120, marginLeft:12, borderRadius:8 }} />}
            <h2 style={{ margin: '8px 0' }}>{data.book?.title ?? 'Unknown title'}</h2>
            {data.book?.authors?.length ? <p>By {data.book.authors.join(', ')}</p> : null}
            {data.book?.publisher ? <p>Publisher: {data.book.publisher} {data.book?.year ? `(${data.book.year})` : ''}</p> : null}
          </section>

          <section style={{ marginTop: 16 }}>
            <h3>Digital Prices</h3>
            <ul>
              {(data.offers ?? []).map((o, i) => (
                <li key={i}>
                  <a href={o.link} target="_blank" rel="noreferrer">{o.source}</a>
                  {` — ${o.title ?? 'View'}`}
                  {o.price ? `: ${o.price.amount.toFixed(2)} ${o.price.currency}` : ' (no price in feed)'}
                  {` [${o.format}]`}
                </li>
              ))}
              {(!data.offers || data.offers.length === 0) && <li>No digital prices found.</li>}
            </ul>
          </section>

          <section style={{ marginTop: 16 }}>
            <h3>Physical Copies (links)</h3>
            <ul>
              {data.physicalLinks && Object.entries(data.physicalLinks).map(([k, v]) => (
                <li key={k}><a href={v} target="_blank" rel="noreferrer">{k}</a></li>
              ))}
            </ul>
          </section>
        </>
      )}

      <footer style={{ marginTop: 32, fontSize: 12, color: '#666' }}>
        <p>No accounts. No tracking. Uses public APIs (Apple, Google Books, Open Library).</p>
      </footer>
    </main>
  )
}
