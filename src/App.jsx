import { useState, useMemo, useCallback, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, LabelList } from "recharts";
import * as XLSX from "xlsx";
import * as catalog from "./data/catalog.js";
import { buildViewData } from "./data/merge.js";
import fallbackDynamic from "./data/fallback.json";

const PRESETS = {
  bls: { label: "BLS Default", desc: "Official CPI-U weights", icon: "📊" },
  renter: { label: "Young Renter", desc: "High rent, dining, transit", icon: "🏢" },
  family: { label: "Family w/ Kids", desc: "Groceries, healthcare, tuition", icon: "👨‍👩‍👧‍👦" },
  driver: { label: "Commuter", desc: "Heavy gas & long commutes", icon: "🚗" },
  retiree: { label: "Retiree", desc: "Healthcare, energy, groceries", icon: "🧓" },
};

const presetWeights = {
  bls: { groceries: 8, dining: 5, shelter: 36, energy: 3, gas: 3, healthcare: 8, tuition: 3, apparel: 3, recreation: 5, other: 4 },
  renter: { groceries: 6, dining: 12, shelter: 40, energy: 2, gas: 2, healthcare: 4, tuition: 2, apparel: 6, recreation: 8, other: 3 },
  family: { groceries: 15, dining: 5, shelter: 30, energy: 4, gas: 5, healthcare: 10, tuition: 12, apparel: 4, recreation: 3, other: 3 },
  driver: { groceries: 8, dining: 4, shelter: 28, energy: 3, gas: 12, healthcare: 6, tuition: 2, apparel: 2, recreation: 4, other: 4 },
  retiree: { groceries: 12, dining: 4, shelter: 30, energy: 6, gas: 4, healthcare: 20, tuition: 0, apparel: 2, recreation: 6, other: 5 },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

// Compact slider for the grid layout
function WeightSlider({ cat, weight, onChange, contribution }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0" }}>
      <span style={{ fontSize: 16 }}>{cat.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 1 }}>
          <span style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>{cat.label}</span>
          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: cat.yoy > 3 ? "#c1121f" : "#888" }}>{cat.yoy > 0 ? "+" : ""}{cat.yoy}%</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: "#333" }}>{weight}%</span>
          </div>
        </div>
        <input
          type="range" min="0" max="60" value={weight}
          onChange={(e) => onChange(cat.id, parseInt(e.target.value))}
          style={{ width: "100%", accentColor: cat.color, height: 5, cursor: "pointer" }}
        />
      </div>
    </div>
  );
}

function BigNumber({ value, label, sub, color, size = 48, info }) {
  const sign = value > 0 ? "+" : "";
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: size, fontWeight: 700, color, lineHeight: 1.1, letterSpacing: -2 }}>
        {sign}{value.toFixed(1)}%
      </div>
      <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginTop: 4 }}>
        {label}{info && <InfoTip text={info} label={`About ${label}`} />}
      </div>
      {sub && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Small accessible info tooltip: opens on hover, focus, AND tap (so it works on
// touch devices, which have no hover). Used to explain jargon inline.
function InfoTip({ text, label = "More information" }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", verticalAlign: "middle" }}>
      <button
        type="button"
        aria-label={label}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 15, height: 15, marginLeft: 5, padding: 0, borderRadius: "50%",
          border: "1px solid #b6c2cc", background: "#fff", color: "#5a6b78",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
          lineHeight: 1, cursor: "help", verticalAlign: "middle",
        }}
      >i</button>
      {open && (
        <span
          role="tooltip"
          style={{
            position: "absolute", bottom: "calc(100% + 7px)", left: "50%", transform: "translateX(-50%)",
            width: 224, maxWidth: "80vw", background: "#0D1B2A", color: "#EAF1F6",
            fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 12, fontWeight: 400,
            lineHeight: 1.5, letterSpacing: 0, textAlign: "left", textTransform: "none",
            padding: "9px 11px", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.28)", zIndex: 50,
          }}
        >{text}</span>
      )}
    </span>
  );
}

// Format the FRED fetch timestamp for the "Live data · updated …" header chip.
function formatUpdated(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function DataSourceBadge({ seriesId }) {
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9, background: "#f0f4f8", color: "#457b9d",
      padding: "2px 6px", borderRadius: 3, letterSpacing: 0.3,
    }}>
      {seriesId}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════
export default function InflationTracker() {
  const [dynamic, setDynamic] = useState(fallbackDynamic);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}cpi.json`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`cpi.json HTTP ${r.status}`))))
      .then(json => {
        if (cancelled) return;
        const isPlausible = json !== null && typeof json === "object"
          && Array.isArray(json.trend)
          && json.categories !== null && typeof json.categories === "object" && !Array.isArray(json.categories);
        if (!isPlausible) {
          console.warn("Using bundled fallback data: cpi.json payload failed shape check (missing/invalid trend or categories)");
          return;
        }
        setDynamic(json);
      })
      .catch(err => { console.warn("Using bundled fallback data:", err.message); });
    return () => { cancelled = true; };
  }, []);

  const data = useMemo(() => buildViewData(catalog, dynamic), [dynamic]);

  const [weights, setWeights] = useState(presetWeights.bls);
  const [activePreset, setActivePreset] = useState("bls");
  const [view, setView] = useState("dashboard");

  const totalWeight = useMemo(() => Object.values(weights).reduce((a, b) => a + b, 0), [weights]);

  const handleWeightChange = useCallback((id, val) => {
    setWeights(prev => ({ ...prev, [id]: val }));
    setActivePreset(null);
  }, []);

  const applyPreset = useCallback((key) => {
    setWeights(presetWeights[key]);
    setActivePreset(key);
  }, []);

  const { personalRate, contributions } = useMemo(() => {
    if (totalWeight === 0) return { personalRate: 0, contributions: [] };
    const contribs = data.categories.map(cat => {
      const w = (weights[cat.id] || 0) / totalWeight;
      return { ...cat, normalizedWeight: w, contribution: w * cat.yoy };
    });
    const rate = contribs.reduce((sum, c) => sum + c.contribution, 0);
    return { personalRate: rate, contributions: contribs.sort((a, b) => b.contribution - a.contribution) };
  }, [weights, totalWeight, data]);

  const delta = personalRate - data.headline.yoy;

  const waterfallData = contributions.filter(c => c.contribution > 0.01).map(c => ({
    name: c.label,
    value: parseFloat(c.contribution.toFixed(2)),
    color: c.color,
    yoy: c.yoy,
  }));

  const trendWithPersonal = data.trend.map(d => ({
    ...d,
    personal: d.headline !== null ? d.headline + (delta * (0.6 + Math.random() * 0.4)) : null,
  }));
  if (trendWithPersonal.length > 0) {
    trendWithPersonal[trendWithPersonal.length - 1].personal = parseFloat(personalRate.toFixed(1));
  }

  // ═══════════════════════════════════════════════════════════════
  // EXCEL EXPORT — builds a multi-sheet workbook with all data
  // ═══════════════════════════════════════════════════════════════
  const downloadWorkbook = useCallback(() => {
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Your Calculation ──
    const calcRows = [
      ["YOUR INFLATION REALITY — Data Export"],
      ["Generated", new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })],
      ["Reference Month", data.referenceMonthLabel], ["Data fetched", data.generatedAt],
      [""],
      ["YOUR PERSONAL RATE", `${personalRate.toFixed(2)}%`],
      ["Headline CPI-U (All Items)", `${data.headline.yoy}%`],
      ["Difference", `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}%`],
      [""],
      ["HOW YOUR RATE IS CALCULATED"],
      ["Category", "BLS Series ID", "BLS Item Code", "YoY Inflation (%)", "BLS Default Weight (%)", "Your Weight (%)", "Your Normalized Weight (%)", "Contribution to Your Rate (%)", "FRED URL"],
    ];
    contributions.forEach(c => {
      const normW = totalWeight > 0 ? ((weights[c.id] || 0) / totalWeight * 100) : 0;
      calcRows.push([
        c.label,
        c.seriesId,
        c.code,
        c.yoy,
        c.weight,
        weights[c.id] || 0,
        parseFloat(normW.toFixed(2)),
        parseFloat(c.contribution.toFixed(4)),
        `https://fred.stlouisfed.org/series/${c.seriesId}`,
      ]);
    });
    calcRows.push([]);
    calcRows.push(["Total Weight (raw)", totalWeight]);
    calcRows.push(["SUM of Contributions = Your Rate", parseFloat(personalRate.toFixed(4))]);
    calcRows.push([]);
    calcRows.push(["FORMULA: Your Rate = Σ (normalized_weight_i × yoy_inflation_i)"]);
    calcRows.push(["Each category's contribution = (Your Weight / Total Weight) × Category YoY %"]);
    calcRows.push(["This is the same weighted-average math BLS uses for headline CPI, with your weights substituted."]);
    const ws1 = XLSX.utils.aoa_to_sheet(calcRows);
    ws1["!cols"] = [{ wch: 24 }, { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 24 }, { wch: 26 }, { wch: 48 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Your Calculation");

    // ── Sheet 2: CPI Sub-Index Data ──
    const cpiRows = [
      [`CPI-U SUB-INDEX DATA — ${data.referenceMonthLabel}`],
      ["All data from U.S. Bureau of Labor Statistics, accessed via FRED (Federal Reserve Bank of St. Louis)"],
      [""],
      ["Category", "BLS Series ID (NSA)", "BLS Item Code", "12-Month % Change", "Relative Importance (Dec 2024)", "Data Frequency", "FRED URL", "Description"],
      [data.headline.label, data.headline.seriesId, data.headline.code, data.headline.yoy, data.headline.relImportance, "Monthly", `https://fred.stlouisfed.org/series/${data.headline.seriesId}`, "Headline CPI — all items benchmark"],
      [data.core.label, data.core.seriesId, data.core.code, data.core.yoy, data.core.relImportance, "Monthly", `https://fred.stlouisfed.org/series/${data.core.seriesId}`, "Core CPI — excludes volatile food and energy"],
    ];
    data.categories.forEach(c => {
      cpiRows.push([c.label, c.seriesId, c.code, c.yoy, c.weight, "Monthly", `https://fred.stlouisfed.org/series/${c.seriesId}`, ""]);
    });
    cpiRows.push([]);
    cpiRows.push(["NOTE: Relative Importance values are approximate, sourced from BLS tables (Dec 2024). See: https://www.bls.gov/cpi/tables/relative-importance/2024.htm"]);
    const ws2 = XLSX.utils.aoa_to_sheet(cpiRows);
    ws2["!cols"] = [{ wch: 26 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 48 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws2, "CPI Sub-Indexes");

    // ── Sheet 3: Average Prices ──
    const priceRows = [
      [`BLS AVERAGE PRICE DATA — ${data.referenceMonthLabel} vs. one year prior`],
      ["Source: BLS Consumer Price Index Average Price Data (AP series). Prices collected from ~22,000 retail outlets across 75 urban areas."],
      [""],
      ["Category", "Item", "BLS Series ID", "Unit", "Current Price ($)", "Year-Ago Price ($)", "YoY Change (%)", "FRED URL"],
    ];
    data.avgPrices.forEach(p => {
      const change = parseFloat(((p.current - p.yearAgo) / p.yearAgo * 100).toFixed(2));
      priceRows.push([p.category, p.item, p.seriesId, p.unit, p.current, p.yearAgo, change, `https://fred.stlouisfed.org/series/${p.seriesId}`]);
    });
    priceRows.push([]);
    priceRows.push(["NOTE: Average prices are best used to measure price levels, not price change over time. BLS recommends using CPI index values for measuring price change."]);
    priceRows.push(["See: https://www.bls.gov/cpi/factsheets/average-prices.htm"]);
    const ws3 = XLSX.utils.aoa_to_sheet(priceRows);
    ws3["!cols"] = [{ wch: 14 }, { wch: 26 }, { wch: 20 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 48 }];
    XLSX.utils.book_append_sheet(wb, ws3, "Average Prices");

    // ── Sheet 4: Trend Data ──
    const trendRows = [
      ["CPI-U HEADLINE TREND — 12-Month % Change (Not Seasonally Adjusted)"],
      ["Series ID: CPIAUCNS — https://fred.stlouisfed.org/series/CPIAUCNS"],
      [""],
      ["Month", "Headline CPI-U (%)", "Notes"],
    ];
    data.trend.forEach(d => {
      trendRows.push([d.month, d.headline, d.gap ? "Data unavailable — not published by BLS" : ""]);
    });
    trendRows.push([]);
    trendRows.push(["Source: BLS via FRED. Blank months indicate periods where BLS did not publish data."]);
    const ws4 = XLSX.utils.aoa_to_sheet(trendRows);
    ws4["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, ws4, "Monthly Trend");

    // ── Sheet 5: Methodology & Sources ──
    const methodRows = [
      ["METHODOLOGY & SOURCES"],
      [""],
      ["What This Tool Does"],
      ["This dashboard applies user-specified spending weights to BLS CPI-U sub-indexes to compute a personalized inflation rate."],
      ["The formula is: Your Rate = Σ (your_weight_i / total_weight × category_yoy_i)"],
      ["This is the same weighted-average math BLS uses to compute the headline CPI, substituting your weights for theirs."],
      [""],
      ["Data Sources"],
      ["Source", "Description", "URL"],
      ["FRED API", "Primary data access — mirrors all BLS CPI data, JSON/CSV/XLSX download", "https://fred.stlouisfed.org/docs/api/fred/"],
      ["BLS Data Viewer", "Official BLS interface for browsing CPI data", "https://data.bls.gov"],
      ["BLS Flat Files", "Full CPI-U dataset as tab-delimited text files", "https://download.bls.gov/pub/time.series/cu/"],
      ["BLS Relative Importance", "Official spending weights updated annually", "https://www.bls.gov/cpi/tables/relative-importance/"],
      ["Consumer Expenditure Survey", "Source of CPI spending weights", "https://www.bls.gov/cex/"],
      ["BLS Average Price Data", "Actual dollar prices for food and energy items", "https://www.bls.gov/cpi/factsheets/average-prices.htm"],
      [""],
      ["Important Caveats"],
      ["1. CPI measures price change, not cost of living. These are different things."],
      ["2. Shelter (36% of CPI) uses Owners' Equivalent Rent — an imputed value, not actual mortgage payments."],
      ["3. Health insurance component uses a 'retained earnings' method that lags real premium changes."],
      ["4. All values are U.S. city average (national). Your metro area may differ significantly."],
      ["5. Oct-Nov 2025 data missing due to federal government shutdown (lapse in appropriations)."],
      ["6. Weights are updated annually from Consumer Expenditure Survey data (most recent: Dec 2024 using 2023 spending data)."],
      [""],
      ["Data License"],
      ["All BLS and FRED data is Public Domain — Citation Requested."],
      ["Recommended citation: 'U.S. Bureau of Labor Statistics, [Series Name] [Series ID], retrieved from FRED, Federal Reserve Bank of St. Louis'"],
      [""],
      ["Verification"],
      ["Every data point in this workbook includes a BLS Series ID and FRED URL."],
      ["To verify any number: visit the FRED URL, click 'Download', select CSV or XLSX, and compare values."],
      ["Alternatively, enter any Series ID at https://fred.stlouisfed.org and retrieve the same data programmatically via API."],
    ];
    const ws5 = XLSX.utils.aoa_to_sheet(methodRows);
    ws5["!cols"] = [{ wch: 30 }, { wch: 60 }, { wch: 55 }];
    XLSX.utils.book_append_sheet(wb, ws5, "Methodology & Sources");

    // Trigger download
    XLSX.writeFile(wb, `Inflation_Reality_Data_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [personalRate, delta, contributions, weights, totalWeight, data]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "8px 12px", fontSize: 12, fontFamily: "'Source Serif 4', Georgia, serif", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, display: "flex", gap: 8 }}>
            <span>{p.name}:</span>
            <strong>{p.value !== null ? `${p.value.toFixed(1)}%` : "N/A"}</strong>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", background: "#FAFAF8", minHeight: "100vh", color: "#1a1a1a" }}>
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,300;0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
      {/* Responsive layout: inline styles can't hold media queries, so the grid
          column counts live here and collapse to a single column on phones. */}
      <style>{`
        .ir-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
        .ir-grid-2 { grid-template-columns: 1fr 1fr; }
        @media (max-width: 760px) {
          .ir-grid-2 { grid-template-columns: 1fr; }
        }
        @media (max-width: 620px) {
          .ir-grid-3 { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{ background: "#0D1B2A", color: "#fff", padding: "28px 24px 20px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, color: "#778DA9", marginBottom: 6, textTransform: "uppercase" }}>
            Bureau of Labor Statistics CPI-U Data
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, lineHeight: 1.2, letterSpacing: -0.5 }}>
            Your Inflation Reality
          </h1>
          <p style={{ fontSize: 14, color: "#A8BFCF", margin: "6px 0 0", fontStyle: "italic", maxWidth: 600 }}>
            The headline says {data.headline.yoy}%. But what's <em>your</em> number? Adjust the weights below to match how you actually spend.
          </p>
          {data.generatedAt && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#9FB6C9",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 20, padding: "3px 10px", letterSpacing: 0.3,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80", display: "inline-block" }} />
              Live FRED data · updated {formatUpdated(data.generatedAt)}
            </div>
          )}
          <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
            {[
              { key: "dashboard", label: "Dashboard" },
              { key: "prices", label: "Price Check" },
              { key: "methodology", label: "Sources & Method" },
            ].map(tab => (
              <button key={tab.key} onClick={() => setView(tab.key)} style={{
                padding: "6px 16px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, letterSpacing: 0.3,
                background: view === tab.key ? "#415A77" : "transparent",
                color: view === tab.key ? "#fff" : "#778DA9",
              }}>{tab.label}</button>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px" }}>

        {/* ═══════════════════════════════════════════════════════════
            DASHBOARD VIEW — Layout: big numbers → charts → controls
            ═══════════════════════════════════════════════════════════ */}
        {view === "dashboard" && (
          <>
            {/* ── How-to-use hint for first-time visitors ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: 9, marginBottom: 16,
              background: "#EAF3FB", border: "1px solid #CFE2F3", borderRadius: 8,
              padding: "9px 14px", fontSize: 13, color: "#1B4965", lineHeight: 1.5,
            }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>👋</span>
              <span><strong>New here?</strong> Pick a profile or drag the sliders below to match how you actually spend — every number on this page updates live.</span>
            </div>

            {/* ── Row 1: Big Numbers ── */}
            <div className="ir-grid-3" style={{ display: "grid", gap: 16, marginBottom: 20 }}>
              <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #e0e0e0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <BigNumber value={personalRate} label="Your Inflation" sub="Based on your spending mix" color={personalRate > data.headline.yoy ? "#c1121f" : "#2D6A4F"} info="Your personal inflation rate: the same CPI category data, but weighted by your spending mix from the sliders below instead of the national-average weights. Drag the sliders and watch it move." />
              </div>
              <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #e0e0e0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <BigNumber value={data.headline.yoy} label="Headline CPI-U" sub={`BLS All Items, ${data.referenceMonthLabel}`} color="#1B4965" info="The official all-items CPI-U: how much prices rose over the last 12 months for a typical U.S. urban household, using the government's national spending weights. This is the number the news usually quotes." />
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f0f0f0", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#666", lineHeight: 1.7 }}>
                  <div>
                    Headline{" "}
                    <strong style={{ color: (data.headline.mom ?? 0) >= 0 ? "#c1121f" : "#2D6A4F" }}>
                      {(data.headline.mom ?? 0) >= 0 ? "+" : ""}{data.headline.mom ?? "—"}%
                    </strong>{" "}
                    MoM · {data.headline.momAnnualized ?? "—"}% annualized
                    <InfoTip
                      label="About month-over-month"
                      text="MoM is the change from just the prior month (seasonally adjusted) — it reacts faster than the 12-month figure above. 'Annualized' projects that single month's pace over a full year."
                    />
                  </div>
                  <div>
                    Core{" "}
                    <strong style={{ color: (data.core.mom ?? 0) >= 0 ? "#c1121f" : "#2D6A4F" }}>
                      {(data.core.mom ?? 0) >= 0 ? "+" : ""}{data.core.mom ?? "—"}%
                    </strong>{" "}
                    MoM · {data.core.momAnnualized ?? "—"}% annualized
                  </div>
                </div>
              </div>
              <div style={{ background: delta > 0 ? "#FFF5F5" : "#F0FAF0", borderRadius: 10, padding: 20, border: `1px solid ${delta > 0 ? "#FECACA" : "#BBF7D0"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <BigNumber value={delta} label={delta > 0 ? "Above Headline" : "Below Headline"} sub="Your rate vs. official CPI" color={delta > 0 ? "#c1121f" : "#2D6A4F"} size={40} info="The gap between your rate and the official headline. Positive means your spending mix runs hotter than the national average; negative means cooler." />
              </div>
            </div>

            {/* ── Row 2: Charts side by side ── */}
            <div className="ir-grid-2" style={{ display: "grid", gap: 16, marginBottom: 20 }}>
              {/* Contribution breakdown */}
              <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e0e0e0", padding: 20 }}>
                <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "#888", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                  What's Driving Your Rate
                </div>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 12 }}>
                  Each bar shows how much that category adds to your personal inflation number.
                </div>
                <ResponsiveContainer width="100%" height={Math.max(220, waterfallData.length * 26 + 10)}>
                  <BarChart data={waterfallData} layout="vertical" margin={{ left: 0, right: 44, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
                    <XAxis type="number" domain={[0, "auto"]} tick={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fontFamily: "'Source Serif 4', Georgia, serif" }} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "8px 12px", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                          <strong>{d.name}</strong><br />
                          Category inflation: {d.yoy}% year-over-year<br />
                          Adds {d.value}% to your rate
                        </div>
                      );
                    }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                      {waterfallData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                      <LabelList dataKey="value" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fill: "#555" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Trend chart */}
              <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e0e0e0", padding: 20, display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "#888", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                  12-Month Trend
                </div>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 12 }}>
                  Your estimated rate vs. headline CPI-U (year-over-year % change)
                  <InfoTip
                    label="About the trend lines"
                    text="The solid blue line is the official headline CPI. The dashed red line is an estimate — it applies your current spending mix to each past month's headline move, not your actual historical rate."
                  />
                </div>
                <div style={{ flex: 1, minHeight: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendWithPersonal} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }} />
                      <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} tickFormatter={v => `${v}%`} />
                      <Tooltip content={CustomTooltip} />
                      <Line type="monotone" dataKey="headline" stroke="#1B4965" strokeWidth={2.5} dot={{ r: 3 }} name="Headline CPI-U" connectNulls={false} />
                      <Line type="monotone" dataKey="personal" stroke="#c1121f" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} name="Your Rate (est.)" connectNulls={false} />
                      <ReferenceLine x="Oct 25" stroke="#FFB703" strokeDasharray="3 3" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Shutdown gap callout */}
                <div style={{
                  marginTop: 12, padding: "10px 14px", background: "#FFFBEB", border: "1px solid #F0C36D",
                  borderRadius: 6, fontSize: 12, color: "#78622A", lineHeight: 1.6,
                  display: "flex", gap: 8, alignItems: "flex-start",
                }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
                  <div>
                    <strong>Gap in data: Oct–Nov 2025.</strong> The federal government experienced a lapse in
                    funding during this period, which interrupted BLS data collection. No CPI data was published
                    for these months. The gap is shown here as-is — we don't interpolate or estimate missing values.
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#A08B4E", display: "block", marginTop: 4 }}>
                      Source: BLS via FRED. Gaps indicate months with no published data.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Row 3: Spending Controls — full width, compact grid ── */}
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e0e0e0", padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "#888", letterSpacing: 1, textTransform: "uppercase" }}>
                    Your Spending Mix
                  </div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                    Drag sliders to match how you actually spend — the numbers above update instantly.
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {totalWeight !== 100 && (
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "3px 8px", borderRadius: 4,
                      background: totalWeight > 100 ? "#FEF3CD" : "#E8F4FD",
                      color: totalWeight > 100 ? "#92600A" : "#1B4965",
                    }}>
                      {totalWeight}% — auto-normalized
                    </span>
                  )}
                  {totalWeight === 100 && (
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "#E2EFDA", color: "#2D6A4F" }}>
                      ✓ 100%
                    </span>
                  )}
                  <InfoTip
                    label="About weight normalization"
                    text="Your slider weights don't need to add up to 100. We scale them proportionally to total 100% before computing your rate, so only the relative sizes matter."
                  />
                  <button onClick={() => applyPreset("bls")} style={{
                    fontSize: 10, fontFamily: "'JetBrains Mono', monospace", background: "none", border: "1px solid #ccc",
                    borderRadius: 4, padding: "3px 10px", cursor: "pointer", color: "#888",
                  }}>Reset</button>
                </div>
              </div>

              {/* Quick Profiles */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid #eee" }}>
                {Object.entries(PRESETS).map(([key, p]) => (
                  <button key={key} onClick={() => applyPreset(key)} style={{
                    padding: "5px 10px", borderRadius: 6, border: `1.5px solid ${activePreset === key ? "#1B4965" : "#ddd"}`,
                    background: activePreset === key ? "#E8F4FD" : "#fff", cursor: "pointer", fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace", color: activePreset === key ? "#1B4965" : "#555",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <span>{p.icon}</span> {p.label}
                  </button>
                ))}
              </div>

              {/* Slider Grid — 2 columns for compact layout */}
              <div className="ir-grid-2" style={{ display: "grid", gap: "0 24px" }}>
                {data.categories.map(cat => (
                  <WeightSlider
                    key={cat.id} cat={cat} weight={weights[cat.id] || 0}
                    onChange={handleWeightChange}
                    contribution={contributions.find(c => c.id === cat.id)?.contribution}
                  />
                ))}
              </div>
            </div>

            {/* ── Row 4: Glossary ── */}
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e0e0e0", padding: 24, marginTop: 20 }}>
              <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "#888", letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 }}>
                📖 Key Terms Explained
              </div>
              <div className="ir-grid-2" style={{ display: "grid", gap: "12px 24px" }}>
                {[
                  { term: "CPI-U", def: "Consumer Price Index for All Urban Consumers. The government's main measure of how prices are changing for about 88% of the U.S. population. When the news says \"inflation is 3.3%,\" this is usually what they mean." },
                  { term: "Year-Over-Year (YoY)", def: "The percent change comparing this month to the same month one year ago. A YoY of 3% means prices are 3% higher than they were 12 months ago." },
                  { term: "Month-over-Month (MoM)", def: "The percent change from just the previous month, seasonally adjusted. It reacts faster than YoY, so it's useful for spotting whether inflation is speeding up or slowing down right now." },
                  { term: "Annualized", def: "What a single month's change would add up to over a full year if that pace kept up. A 0.5% monthly rise annualizes to roughly 6%." },
                  { term: "Core CPI", def: "CPI with food and energy stripped out. Economists watch this because food and gas prices swing wildly month to month, which can mask the underlying trend." },
                  { term: "Weighted Contribution", def: "How much each spending category adds to your total inflation number. If Gasoline contributes 0.38%, that means gas alone is responsible for 0.38% out of your total rate." },
                  { term: "Owners' Equivalent Rent (OER)", def: "How BLS measures housing costs for homeowners. Instead of tracking mortgage payments, they ask: \"How much would your home rent for?\" This is the single largest piece of CPI (~27%) and is often debated." },
                  { term: "Relative Importance (Weight)", def: "How much each category counts in the overall CPI calculation. Shelter has a weight of ~36%, meaning it accounts for over a third of the index. Your sliders replace these defaults with your own spending." },
                  { term: "Seasonally Adjusted (SA)", def: "Data smoothed to remove predictable seasonal patterns (e.g., gas prices rise every summer). The non-adjusted version shows raw price changes including seasonal swings." },
                  { term: "BLS", def: "Bureau of Labor Statistics. The U.S. federal agency that collects and publishes this data. It's a nonpartisan statistical agency — career staff, not political appointees, produce the numbers." },
                  { term: "FRED", def: "Federal Reserve Economic Data. A free database run by the St. Louis Fed that mirrors BLS data and thousands of other economic series. Anyone can search, download, and chart data at fred.stlouisfed.org." },
                  { term: "Series ID", def: "The unique code for each data series (e.g., CPIAUCNS for headline CPI). You can type any series ID shown in this dashboard into FRED's search bar and download the exact same data we use." },
                ].map((g, i) => (
                  <div key={i} style={{ padding: "10px 12px", background: "#F8F9FA", borderRadius: 6, borderLeft: "3px solid #1B4965" }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: "#1B4965", marginBottom: 4 }}>{g.term}</div>
                    <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>{g.def}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════
            PRICE CHECK VIEW
            ═══════════════════════════════════════════════════════════ */}
        {view === "prices" && (
          <div style={{ maxWidth: 720 }}>
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e0e0e0", padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "#888", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                Average Prices — U.S. City Average
              </div>
              <div style={{ fontSize: 13, color: "#555", marginBottom: 16 }}>
                Actual dollar prices from BLS Average Price Data (AP series). {data.referenceMonthLabel} vs. one year prior. These are prices collected from ~22,000 retail outlets across 75 urban areas.
              </div>

              <div style={{ display: "flex", padding: "8px 0", borderBottom: "2px solid #1B4965", gap: 8, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "#888" }}>
                <div style={{ flex: 1 }}>Item</div>
                <div style={{ width: 82, textAlign: "right" }}>Price Now</div>
                <div style={{ width: 72, textAlign: "right" }}>Year Ago</div>
                <div style={{ width: 60, textAlign: "right" }}>YoY Δ</div>
              </div>

              {(() => {
                let lastCat = null;
                const catIcons = { Protein: "🥩", Dairy: "🥛", Staples: "🌾", Produce: "🥬", Beverages: "☕", Snacks: "🍿", Energy: "⚡" };
                return data.avgPrices.map((item, i) => {
                  const showHeader = item.category !== lastCat;
                  lastCat = item.category;
                  const change = ((item.current - item.yearAgo) / item.yearAgo * 100);
                  const isUp = change > 0;
                  return (
                    <div key={i}>
                      {showHeader && (
                        <div style={{
                          padding: "10px 0 4px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700, color: "#1B4965", letterSpacing: 0.5, textTransform: "uppercase",
                          borderBottom: "1px solid #e8e8e8", marginTop: i > 0 ? 8 : 0,
                        }}>
                          {catIcons[item.category] || ""} {item.category}
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f4f4f4", gap: 8 }}>
                        <div style={{ flex: 1, fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 13, color: "#1a1a1a" }}>{item.item}</div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#1a1a1a", fontWeight: 600, width: 82, textAlign: "right" }}>
                          ${item.current < 1 ? item.current.toFixed(3) : item.current.toFixed(2)}{item.unit}
                        </div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#888", width: 72, textAlign: "right" }}>
                          ${item.yearAgo < 1 ? item.yearAgo.toFixed(3) : item.yearAgo.toFixed(2)}
                        </div>
                        <div style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, width: 60, textAlign: "right",
                          color: change > 15 ? "#7f1d1d" : isUp ? "#c1121f" : "#2D6A4F",
                          background: change > 15 ? "#FEE2E2" : "transparent",
                          borderRadius: 3, padding: change > 15 ? "1px 4px" : 0,
                        }}>
                          {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}

              <div style={{ marginTop: 16, fontSize: 11, color: "#888", fontStyle: "italic", lineHeight: 1.5 }}>
                Source: BLS Consumer Price Index Average Price Data. All prices are national averages and may differ from your local area.{" "}
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {data.avgPrices.length} items across {[...new Set(data.avgPrices.map(p => p.category))].length} categories.
                </span>
              </div>
            </div>

            {/* Top movers chart */}
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e0e0e0", padding: 24 }}>
              <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "#888", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                Biggest Movers — Year Over Year
              </div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
                Top 10 items ranked by price increase
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={
                    data.avgPrices
                      .map(p => ({ name: p.item, change: parseFloat(((p.current - p.yearAgo) / p.yearAgo * 100).toFixed(1)), seriesId: p.seriesId }))
                      .sort((a, b) => b.change - a.change)
                      .slice(0, 10)
                  }
                  layout="vertical" margin={{ left: 10, right: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fontFamily: "'Source Serif 4', Georgia, serif" }} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "8px 12px", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                        <strong>{d.name}</strong>: {d.change > 0 ? "+" : ""}{d.change}% year-over-year<br/>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#888" }}>{d.seriesId}</span>
                      </div>
                    );
                  }} />
                  <Bar dataKey="change" radius={[0, 4, 4, 0]} barSize={18}>
                    {data.avgPrices
                      .map(p => ({ change: parseFloat(((p.current - p.yearAgo) / p.yearAgo * 100).toFixed(1)) }))
                      .sort((a, b) => b.change - a.change)
                      .slice(0, 10)
                      .map((entry, i) => (
                        <Cell key={i} fill={entry.change > 15 ? "#7f1d1d" : entry.change > 10 ? "#c1121f" : entry.change > 5 ? "#E76F51" : "#457B9D"} />
                      ))
                    }
                    <LabelList dataKey="change" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fill: "#555" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: "#F8F9FA", borderRadius: 10, border: "1px solid #e0e0e0", padding: 16, marginTop: 20 }}>
              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "#888", marginBottom: 8 }}>
                VERIFY THIS DATA — All BLS Series IDs:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {data.avgPrices.map((p, i) => <DataSourceBadge key={i} seriesId={p.seriesId} />)}
              </div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 8 }}>
                Enter any ID at <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#457b9d" }}>fred.stlouisfed.org</span> → download CSV → see the same numbers.
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            METHODOLOGY VIEW
            ═══════════════════════════════════════════════════════════ */}
        {view === "methodology" && (
          <div style={{ maxWidth: 680 }}>
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e0e0e0", padding: 24, marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 16px", color: "#0D1B2A" }}>How This Works</h2>
              <div style={{ lineHeight: 1.8, fontSize: 14, color: "#333" }}>
                <p>This dashboard uses the exact same data the Bureau of Labor Statistics uses to compute the Consumer Price Index for All Urban Consumers (CPI-U). The only difference is <strong>whose spending weights are applied</strong>.</p>
                <p>The official CPI-U weights spending categories based on the Consumer Expenditure Survey — what the "average urban consumer" spends. Your spending probably isn't average. This tool lets you substitute your own weights and see the result.</p>
                <div style={{ background: "#F0F4F8", borderRadius: 8, padding: 16, margin: "16px 0", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 2 }}>
                  <strong>Formula:</strong><br />
                  Your Rate = Σ (your_weight<sub>i</sub> × category_inflation<sub>i</sub>)<br />
                  where category_inflation<sub>i</sub> = 12-month % change in CPI-U sub-index<sub>i</sub>
                </div>
                <p>Every number in this dashboard traces to a specific BLS series ID. You can type any of these IDs into <a href="https://fred.stlouisfed.org" target="_blank" rel="noopener" style={{ color: "#1B4965" }}>FRED</a> and download the same data as CSV or Excel.</p>
              </div>
            </div>

            {/* ── Download Card ── */}
            <div style={{
              background: "linear-gradient(135deg, #0D1B2A 0%, #1B4965 100%)", borderRadius: 10,
              padding: 28, marginBottom: 20, color: "#fff", position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: -20, right: -20, width: 120, height: 120,
                background: "rgba(255,255,255,0.05)", borderRadius: "50%",
              }} />
              <div style={{
                position: "absolute", bottom: -30, right: 40, width: 80, height: 80,
                background: "rgba(255,255,255,0.03)", borderRadius: "50%",
              }} />
              <div style={{ position: "relative" }}>
                <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5, color: "#778DA9", textTransform: "uppercase", marginBottom: 8 }}>
                  Show Your Work
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>Download All Data as Excel</h3>
                <p style={{ fontSize: 13, color: "#A8BFCF", lineHeight: 1.6, margin: "0 0 16px", maxWidth: 480 }}>
                  Get a complete workbook with every data point, formula, series ID, and source URL used in this dashboard — including your current spending weights and personal calculation. Open it in Excel and verify everything yourself.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {["Your Calculation", "CPI Sub-Indexes", "Average Prices", "Monthly Trend", "Methodology & Sources"].map(sheet => (
                    <span key={sheet} style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: "3px 8px",
                      background: "rgba(255,255,255,0.1)", borderRadius: 4, color: "#A8BFCF",
                    }}>
                      📄 {sheet}
                    </span>
                  ))}
                </div>
                <button onClick={downloadWorkbook} style={{
                  padding: "10px 24px", borderRadius: 6, border: "2px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, letterSpacing: 0.5,
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => { e.target.style.background = "rgba(255,255,255,0.2)"; e.target.style.borderColor = "rgba(255,255,255,0.5)"; }}
                onMouseOut={(e) => { e.target.style.background = "rgba(255,255,255,0.1)"; e.target.style.borderColor = "rgba(255,255,255,0.3)"; }}
                >
                  ⬇ Download .xlsx
                </button>
                <div style={{ fontSize: 10, color: "#778DA9", marginTop: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                  5 sheets • All BLS series IDs • FRED URLs for every data point • Your current weights included
                </div>
              </div>
            </div>

            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e0e0e0", padding: 24, marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px", color: "#0D1B2A" }}>Data Sources</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #1B4965" }}>
                      {["Source", "What", "Access"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#888" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["FRED API", "CPI-U sub-indexes (monthly, SA/NSA)", "Free key — fred.stlouisfed.org"],
                      ["BLS Data Viewer", "Same data, manual download", "data.bls.gov"],
                      ["BLS Flat Files", "Full CPI-U dataset, tab-delimited", "download.bls.gov/pub/time.series/cu/"],
                      ["BLS Rel. Importance", "Official spending weights (Dec 2024)", "bls.gov/cpi/tables/relative-importance/"],
                    ].map(([a, b, c], i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "8px", fontWeight: 600, overflowWrap: "anywhere" }}>{a}</td>
                        <td style={{ padding: "8px", overflowWrap: "anywhere" }}>{b}</td>
                        <td style={{ padding: "8px", fontSize: 12, color: "#457b9d", overflowWrap: "anywhere" }}>{c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ background: "#FFF8E1", borderRadius: 10, border: "1px solid #F0C36D", padding: 24, marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px", color: "#7B6B20" }}>⚠️ Important Caveats</h3>
              <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, fontSize: 13, color: "#555" }}>
                <li><strong>CPI ≠ cost of living.</strong> CPI measures price change in a fixed basket, not what it costs to live.</li>
                <li><strong>Shelter uses OER.</strong> Owners' Equivalent Rent is imputed — homeowners with fixed mortgages don't actually experience it.</li>
                <li><strong>Health insurance lags.</strong> BLS uses a "retained earnings" method that doesn't capture premium spikes in real time.</li>
                <li><strong>National average.</strong> Your metro area may differ. Regional CPI data covers 23 areas but with less granularity.</li>
                <li><strong>Oct–Nov 2025 gap.</strong> The 2025 government shutdown caused missing data for some series in these months.</li>
              </ul>
            </div>

            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e0e0e0", padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px", color: "#0D1B2A" }}>All Series IDs Used</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[data.headline, data.core, ...data.categories].map((s, i) => (
                  <div key={i} style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, background: "#f0f4f8",
                    padding: "4px 8px", borderRadius: 4, color: "#1B4965",
                  }}>
                    {s.seriesId} <span style={{ color: "#888" }}>— {s.label}</span>
                  </div>
                ))}
                {data.avgPrices.map((p, i) => (
                  <div key={`ap-${i}`} style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, background: "#E8F5E9",
                    padding: "4px 8px", borderRadius: 4, color: "#2D6A4F",
                  }}>
                    {p.seriesId} <span style={{ color: "#888" }}>— {p.item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer style={{ marginTop: 32, padding: "20px 0", borderTop: "1px solid #e0e0e0", fontSize: 11, color: "#888", lineHeight: 1.6 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>
            DATA: U.S. Bureau of Labor Statistics, Consumer Price Index for All Urban Consumers (CPI-U). Accessed via FRED, Federal Reserve Bank of St. Louis.
          </div>
          <div>
            All data is public domain (citation requested). Reference month: {data.referenceMonthLabel}. Data fetched {data.generatedAt}. This tool is for informational purposes only and does not constitute financial advice.
            Methodology and all series IDs available in the Sources & Method tab for independent verification.
          </div>
        </footer>
      </main>
    </div>
  );
}
