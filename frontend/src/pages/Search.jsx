import { useState, useCallback } from "react";
import { searchRequests } from "../api.js";

const QUICK_SEARCHES = [
  { label: "water leaking near market", q: "water leaking near market" },
  { label: "رائحة كريهة (foul smell)", q: "رائحة كريهة" },
  { label: "سرب مياه (typo: missing ت)", q: "سرب مياه" },
  { label: "broken lamp", q: "broken lamp post school" },
  { label: "pothole road", q: "pothole road damage" },
  { label: "illegal dumping", q: "illegal dump waste factory" },
];

function highlight(text, raw) {
  if (!raw) return text;
  const withHL = raw.replace(/__HL__(.*?)__\/HL__/g, "<mark>$1</mark>");
  return <span dangerouslySetInnerHTML={{ __html: withHL }} />;
}

function statusBadge(s) {
  const key = s?.toLowerCase().replace(" ", "_");
  return <span className={`badge badge-${key}`}>{s?.replace("_", " ")}</span>;
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState("");

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(q);
    try {
      const data = await searchRequests(q);
      setResults(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const onKeyDown = (e) => { if (e.key === "Enter") doSearch(query); };

  const setQuick = (q) => { setQuery(q); doSearch(q); };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Elasticsearch Search</div>
        <div className="page-sub">Full-text · Arabic + English · Fuzzy matching · Bilingual support · UC-02 duplicate detection</div>
      </div>

      <div className="page-content">
        <div className="search-input-wrap" style={{ maxWidth: 620 }}>
          <span className="search-icon">⌕</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder='Search in Arabic, English, or mixed — e.g. "تسرب مياه" or "broken lamp"'
          />
        </div>

        <div className="search-chips">
          <span style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center", marginRight: 4 }}>Quick:</span>
          {QUICK_SEARCHES.map((qs) => (
            <button key={qs.q} className="chip" onClick={() => setQuick(qs.q)}>{qs.label}</button>
          ))}
        </div>

        {/* ES explanation cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: 24 }}>
          {[
            { icon: "🔤", title: "Arabic analyzer", desc: "Normalizes ألف/همزة variants, removes stop words, handles diacritics" },
            { icon: "🔍", title: "Fuzzy matching", desc: "AUTO fuzziness catches typos — 'سرب مياه' matches 'تسرب مياه'" },
            { icon: "🌐", title: "Bilingual", desc: "Searches descriptionAr and descriptionEn simultaneously with boosting" },
          ].map((f) => (
            <div key={f.title} style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius)", padding: "12px 14px", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{f.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", marginBottom: 3 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {loading && <div className="loading"><div className="spinner" /><span>Querying Elasticsearch...</span></div>}
        {error && <div style={{ color: "var(--red)", fontSize: 13, padding: "16px 0" }}>⚠ {error}</div>}

        {results && !loading && (
          <>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
              <span style={{ color: "var(--green)" }}>{results.total}</span> results for <span style={{ color: "var(--blue)", fontFamily: "var(--mono)" }}>"{searched}"</span>
            </div>

            {results.hits.length === 0 ? (
              <div className="empty"><div className="empty-icon">🔎</div><div>No results found</div></div>
            ) : (
              results.hits.map((hit, i) => (
                <div key={i} className="search-hit">
                  <div className="search-hit-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-muted)" }}>{hit.requestId}</span>
                      {statusBadge(hit.status)}
                      <span className="badge badge-cat">{hit.category?.replace(/_/g, " ")}</span>
                      {hit.isDuplicate && <span className="badge badge-rejected">duplicate</span>}
                    </div>
                    <span className="search-score">score: {hit._score?.toFixed(2)}</span>
                  </div>

                  {/* Highlighted snippet */}
                  <div className="search-snippet">
                    {hit._highlight?.descriptionEn?.[0]
                      ? highlight(null, hit._highlight.descriptionEn[0])
                      : hit._highlight?.descriptionAr?.[0]
                      ? highlight(null, hit._highlight.descriptionAr[0])
                      : (hit.descriptionEn || hit.descriptionAr || "—").substring(0, 200) + "..."}
                  </div>

                  {/* Arabic description if available */}
                  {hit.descriptionAr && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", direction: "rtl", textAlign: "right", marginTop: 6, lineHeight: 1.7 }}>
                      {hit.descriptionAr.substring(0, 120)}...
                    </div>
                  )}

                  <div className="search-meta">
                    <span className="badge badge-district">{hit.districtName}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{hit.citizenName}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
                      {hit.createdAt ? new Date(hit.createdAt).toLocaleDateString("en-GB") : ""}
                    </span>
                  </div>
                </div>
              ))
            )}

            {/* ES query explanation */}
            <div style={{ marginTop: 24, padding: "14px 16px", background: "var(--bg-elevated)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>ES Query sent to Elasticsearch</div>
              <pre style={{ fontSize: 11, color: "var(--green)", fontFamily: "var(--mono)", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{JSON.stringify({
                query: { bool: { must: [{ multi_match: { query: searched, fields: ["descriptionEn^3", "descriptionAr^3", "addressTextEn^2", "addressTextAr^2"], fuzziness: "AUTO", operator: "or" } }] } },
                highlight: { fields: { descriptionEn: {}, descriptionAr: {} } },
                size: 10,
              }, null, 2)}</pre>
            </div>
          </>
        )}

        {!results && !loading && (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div>Enter a search query above or pick a quick example</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Powered by Elasticsearch 8.12 · Arabic + English analyzer · Fuzzy matching enabled</div>
          </div>
        )}
      </div>
    </>
  );
}
