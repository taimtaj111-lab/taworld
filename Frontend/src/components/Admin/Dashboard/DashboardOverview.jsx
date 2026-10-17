import React, { useCallback, useEffect, useState } from "react";
import "./DashboardOverview.css";

const BASE = "http://localhost/tajworld/Backend/backend/Accounts";
const OVERVIEW_API = `${BASE}/dashboard_overview.php`;
const REPORT_API = `${BASE}/accounts.php?action=report`;

async function getJson(url) {
  const res = await fetch(url);
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("Non-JSON response:", text);
    throw new Error("সার্ভার থেকে সঠিক রেসপন্স আসেনি। PHP error log দেখুন।");
  }

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `Request failed (HTTP ${res.status}).`);
  }

  return data;
}

const bdt = (n) => {
  const v = Number(n) || 0;
  return (
    (v < 0 ? "-" : "") +
    "৳" +
    Math.abs(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
};

const short = (n) => {
  const v = Math.abs(Number(n) || 0);
  const sign = n < 0 ? "-" : "";
  if (v >= 10000000) return `${sign}${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `${sign}${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${sign}${(v / 1000).toFixed(1)}k`;
  return `${sign}${Math.round(v)}`;
};

const monthLabel = (ym) => {
  const [y, m] = String(ym).split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[(Number(m) || 1) - 1]} ${String(y).slice(2)}`;
};

const STATUS_COLORS = {
  Pending: "#f59f00",
  Processing: "#0dcaf0",
  Shipped: "#6f42c1",
  Delivered: "#198754",
  Cancelled: "#dc3545",
};

/* ---------- small pieces ---------- */
function Delta({ cur, prev }) {
  const c = Number(cur) || 0;
  const p = Number(prev) || 0;

  if (p === 0 && c === 0) return <span className="dv-delta flat">— একই</span>;
  if (p === 0) return <span className="dv-delta up">▲ নতুন</span>;

  const pct = ((c - p) / p) * 100;
  const cls = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  const arrow = pct > 0 ? "▲" : pct < 0 ? "▼" : "—";

  return <span className={`dv-delta ${cls}`}>{arrow} {Math.abs(pct).toFixed(1)}%</span>;
}

function Compare({ label, cur, prev, prevLabel }) {
  return (
    <div className="dv-compare">
      <div className="dv-compare-label">{label}</div>
      <div className="dv-compare-value">{bdt(cur)}</div>
      <div className="dv-compare-sub">
        {prevLabel}: {bdt(prev)} <Delta cur={cur} prev={prev} />
      </div>
    </div>
  );
}

function Panel({ title, right, children, className = "" }) {
  return (
    <section className={`dv-panel ${className}`}>
      <div className="dv-panel-head">
        <h4>{title}</h4>
        {right}
      </div>
      {children}
    </section>
  );
}

/* ---------- charts (pure SVG) ---------- */
function AreaChart({ labels, values, color = "#a4794d", name = "বিক্রি" }) {
  const W = 720, H = 260, L = 52, R = 14, T = 14, B = 30;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const span = max - min || 1;

  const x = (i) => L + (labels.length <= 1 ? 0 : (i * (W - L - R)) / (labels.length - 1));
  const y = (v) => T + ((max - v) * (H - T - B)) / span;

  const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `M${x(0)},${y(0)} ` + values.map((v, i) => `L${x(i)},${y(v)}`).join(" ") + ` L${x(values.length - 1)},${y(0)} Z`;

  const ticks = [0, 1, 2, 3, 4].map((i) => min + (span * i) / 4);
  const step = Math.max(1, Math.ceil(labels.length / 8));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dv-svg" role="img">
      <defs>
        <linearGradient id="dvArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="dv-grid" />
          <text x={L - 8} y={y(t) + 4} textAnchor="end" className="dv-axis">{short(t)}</text>
        </g>
      ))}

      {labels.map((lb, i) =>
        i % step === 0 ? (
          <text key={`${lb}-${i}`} x={x(i)} y={H - 8} textAnchor="middle" className="dv-axis">{lb}</text>
        ) : null
      )}

      <path d={area} fill="url(#dvArea)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />

      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="4" fill="#fff" stroke={color} strokeWidth="2">
          <title>{`${labels[i]} | ${name}: ${bdt(v)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function SignedBars({ labels, values, name = "লাভ / ক্ষতি" }) {
  const W = 720, H = 260, L = 52, R = 14, T = 14, B = 30;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const span = max - min || 1;

  const y = (v) => T + ((max - v) * (H - T - B)) / span;
  const gw = (W - L - R) / Math.max(labels.length, 1);
  const bw = Math.max(5, gw * 0.6);
  const ticks = [0, 1, 2, 3, 4].map((i) => min + (span * i) / 4);
  const step = Math.max(1, Math.ceil(labels.length / 10));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dv-svg" role="img">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="dv-grid" />
          <text x={L - 8} y={y(t) + 4} textAnchor="end" className="dv-axis">{short(t)}</text>
        </g>
      ))}

      {values.map((v, i) => (
        <g key={i}>
          <rect
            x={L + i * gw + (gw - bw) / 2}
            y={Math.min(y(v), y(0))}
            width={bw}
            height={Math.max(Math.abs(y(v) - y(0)), 1)}
            rx="3"
            fill={v < 0 ? "#dc3545" : "#198754"}
          >
            <title>{`${labels[i]} | ${name}: ${bdt(v)}`}</title>
          </rect>
          {i % step === 0 ? (
            <text x={L + i * gw + gw / 2} y={H - 8} textAnchor="middle" className="dv-axis">{labels[i]}</text>
          ) : null}
        </g>
      ))}

      <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} className="dv-zero" />
    </svg>
  );
}

function Donut({ items }) {
  const total = items.reduce((t, i) => t + i.value, 0);
  const r = 70;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="dv-donut-wrap">
      <svg viewBox="0 0 200 200" className="dv-donut" role="img">
        <circle cx="100" cy="100" r={r} fill="none" stroke="#eee" strokeWidth="26" />
        {total > 0 &&
          items.map((it) => {
            const len = (it.value / total) * c;
            const el = (
              <circle
                key={it.name}
                cx="100"
                cy="100"
                r={r}
                fill="none"
                stroke={it.color}
                strokeWidth="26"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 100 100)"
              >
                <title>{`${it.name}: ${it.value}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
        <text x="100" y="96" textAnchor="middle" className="dv-donut-num">{total}</text>
        <text x="100" y="116" textAnchor="middle" className="dv-donut-cap">মোট অর্ডার</text>
      </svg>

      <ul className="dv-donut-legend">
        {items.map((it) => (
          <li key={it.name}>
            <i style={{ background: it.color }} /> {it.name} <b>{it.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- main ---------- */
export default function DashboardOverview({ stats = {}, onNavigate }) {
  const [ov, setOv] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [period, setPeriod] = useState("monthly");
  const [profitView, setProfitView] = useState("monthly");

  const load = useCallback(async () => {
    setLoading(true);
    setErrors([]);

    const [a, b] = await Promise.allSettled([getJson(OVERVIEW_API), getJson(REPORT_API)]);
    const errs = [];

    if (a.status === "fulfilled") setOv(a.value);
    else {
      console.error(a.reason);
      errs.push("ওভারভিউ ডেটা: " + a.reason.message);
    }

    if (b.status === "fulfilled") setReport(b.value);
    else {
      console.error(b.reason);
      errs.push("রিপোর্ট ডেটা: " + b.reason.message);
    }

    setErrors(errs);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const go = (view, path) => {
    if (onNavigate) onNavigate(view, path);
  };

  const s = report?.summary;
  const inv = ov?.inventory;
  const cmp = ov?.compare;

  /* ----- sales chart data ----- */
  let salesLabels = [];
  let salesValues = [];

  if (period === "daily" && report) {
    const d = [...report.daily].reverse();
    salesLabels = d.map((r) => r.date.slice(5));
    salesValues = d.map((r) => r.sales);
  } else if (period === "monthly" && report) {
    const m = [...report.monthly].reverse();
    salesLabels = m.map((r) => monthLabel(r.month));
    salesValues = m.map((r) => r.sales);
  } else if (period === "weekly" && ov) {
    salesLabels = ov.weekly.map((r) => r.label);
    salesValues = ov.weekly.map((r) => r.sales);
  } else if (period === "yearly" && ov) {
    salesLabels = ov.yearly.map((r) => r.label);
    salesValues = ov.yearly.map((r) => r.sales);
  }

  /* ----- profit chart data ----- */
  let profitLabels = [];
  let profitValues = [];

  if (report) {
    if (profitView === "daily") {
      const d = [...report.daily].reverse();
      profitLabels = d.map((r) => r.date.slice(5));
      profitValues = d.map((r) => r.profit);
    } else {
      const m = [...report.monthly].reverse();
      profitLabels = m.map((r) => monthLabel(r.month));
      profitValues = m.map((r) => r.profit);
    }
  }

  const statusItems = ov
    ? Object.keys(STATUS_COLORS).map((k) => ({ name: k, value: ov.statuses?.[k] || 0, color: STATUS_COLORS[k] }))
    : [];

  const collected = s ? Math.max(s.total_sales - s.cod_due - s.online_pending, 0) : 0;
  const bal = s?.balances || {};
  const maxCatStock = Math.max(...(ov?.category_stock || []).map((c) => c.units), 1);
  const maxCatSales = Math.max(...(ov?.top_categories || []).map((c) => c.revenue), 1);

  if (loading && !ov && !report) return <div className="dv-loading">ড্যাশবোর্ড লোড হচ্ছে…</div>;

  return (
    <div className="dv">
      <div className="dv-head">
        <h3>📊 Business Overview</h3>
        <button className="dv-btn" onClick={load} disabled={loading}>
          {loading ? "রিফ্রেশ হচ্ছে…" : "🔄 রিফ্রেশ"}
        </button>
      </div>

      {errors.map((e) => (
        <div className="dv-error" key={e}>{e}</div>
      ))}

      {/* A. Summary cards */}
      <div className="dv-cards">
        <div className="dv-card c-purple">
          <span>Total Sales</span>
          <b>{bdt(s?.total_sales)}</b>
          <small>মোট বিক্রি ({s?.valid_orders ?? 0} টি বৈধ অর্ডার)</small>
        </div>
        <div className={`dv-card ${(s?.net_profit ?? 0) < 0 ? "c-red" : "c-green"}`}>
          <span>Net Profit</span>
          <b>{bdt(s?.net_profit)}</b>
          <small>বিক্রি − পণ্যের খরচ − অন্যান্য খরচ</small>
        </div>
        <div className="dv-card c-blue">
          <span>Total Orders</span>
          <b>{stats.totalOrders ?? s?.total_orders ?? 0}</b>
          <small>মোট অর্ডার</small>
        </div>
        <div className="dv-card c-orange">
          <span>Total Products</span>
          <b>{stats.totalProducts ?? inv?.total_products ?? 0}</b>
          <small>পণ্যের সংখ্যা</small>
        </div>
        <div className="dv-card c-gray">
          <span>Today's Orders</span>
          <b>{stats.todayOrders ?? cmp?.today?.orders ?? 0}</b>
          <small>আজকের অর্ডার</small>
        </div>
      </div>

      {/* B. Sales overview + inventory status */}
      <div className="dv-grid-main">
        <Panel
          title="Sales Overview"
          right={
            <select className="dv-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="daily">Daily (৩১ দিন)</option>
              <option value="weekly">Weekly (১২ সপ্তাহ)</option>
              <option value="monthly">Monthly (১২ মাস)</option>
              <option value="yearly">Yearly (৫ বছর)</option>
            </select>
          }
        >
          {salesValues.length ? (
            <AreaChart labels={salesLabels} values={salesValues} />
          ) : (
            <div className="dv-empty">গ্রাফের ডেটা পাওয়া যায়নি।</div>
          )}

          {cmp && (
            <div className="dv-compare-row">
              <Compare label="আজ" cur={cmp.today.sales} prev={cmp.yesterday.sales} prevLabel="গতকাল" />
              <Compare label="এই সপ্তাহ" cur={cmp.this_week.sales} prev={cmp.last_week.sales} prevLabel="গত সপ্তাহ" />
              <Compare label="এই মাস" cur={cmp.this_month.sales} prev={cmp.last_month.sales} prevLabel="গত মাস" />
            </div>
          )}
        </Panel>

        <Panel title="Inventory Status">
          {inv ? (
            <>
              <ul className="dv-inv">
                <li><i className="ok" /> In Stock <b>{inv.in_stock}</b></li>
                <li><i className="low" /> Low Stock (≤ {ov.low_stock_limit}) <b>{inv.low_stock}</b></li>
                <li><i className="out" /> Out of Stock <b>{inv.out_of_stock}</b></li>
                <li><i className="units" /> মোট স্টক ইউনিট <b>{inv.total_units}</b></li>
              </ul>
              {s && (
                <p className="dv-note">
                  স্টকের ক্রয়মূল্য: <b>{bdt(s.stock_cost_value)}</b><br />
                  স্টকের বিক্রয়মূল্য: <b>{bdt(s.stock_sell_value)}</b>
                </p>
              )}
              <button className="dv-btn wide" onClick={() => go("product-list", "/admin/product-list")}>
                Manage Inventory
              </button>
            </>
          ) : (
            <div className="dv-empty">ডেটা নেই</div>
          )}
        </Panel>
      </div>

      {/* C. Order management overview */}
      {ov && (
        <div className="dv-cards four">
          <div className="dv-card c-orange clickable" onClick={() => go("orders", "/admin-orders")}>
            <span>Pending Orders</span>
            <b>{ov.statuses.Pending || 0}</b>
            <small>এখনো নিশ্চিত বা প্রসেস হয়নি</small>
          </div>
          <div className="dv-card c-blue clickable" onClick={() => go("orders", "/admin-orders")}>
            <span>Processing / Shipped</span>
            <b>{(ov.statuses.Processing || 0) + (ov.statuses.Shipped || 0)}</b>
            <small>প্রস্তুত হচ্ছে বা ডেলিভারিতে আছে</small>
          </div>
          <div className="dv-card c-green clickable" onClick={() => go("orders", "/admin-orders")}>
            <span>Delivered Orders</span>
            <b>{ov.statuses.Delivered || 0}</b>
            <small>সফলভাবে ডেলিভারি হয়েছে</small>
          </div>
          <div className="dv-card c-red clickable" onClick={() => go("orders", "/admin-orders")}>
            <span>Cancelled / Returned</span>
            <b>{(ov.statuses.Cancelled || 0) + (ov.returned || 0)}</b>
            <small>বাতিল {ov.statuses.Cancelled || 0} | ফেরত {ov.returned || 0}</small>
          </div>
        </div>
      )}

      {/* Profit & Loss + order status */}
      <div className="dv-grid-2">
        <Panel
          title="Profit & Loss"
          right={
            <select className="dv-select" value={profitView} onChange={(e) => setProfitView(e.target.value)}>
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
            </select>
          }
        >
          {profitValues.length ? (
            <SignedBars labels={profitLabels} values={profitValues} />
          ) : (
            <div className="dv-empty">ডেটা নেই</div>
          )}
          <p className="dv-note">সবুজ = লাভ, লাল = ক্ষতি</p>
        </Panel>

        <Panel title="Order Status">
          {ov ? <Donut items={statusItems} /> : <div className="dv-empty">ডেটা নেই</div>}
        </Panel>
      </div>

      {/* D. Financial overview */}
      {s && (
        <Panel title="Financial Overview — টাকার হিসাব">
          <div className="dv-fin">
            <div><span>মোট বিক্রি</span><b>{bdt(s.total_sales)}</b></div>
            <div><span>সংগৃহীত টাকা (আনুমানিক)</span><b className="pos">{bdt(collected)}</b></div>
            <div><span>কাস্টমারের বকেয়া (অনলাইন যাচাই বাকি)</span><b className="neg">{bdt(s.online_pending)}</b></div>
            <div><span>COD থেকে পাওনা</span><b className="neg">{bdt(s.cod_due)}</b></div>
            <div><span>পণ্য কেনার মোট খরচ</span><b>{bdt(ov?.purchase_total)}</b></div>
            <div><span>সরবরাহকারীর বকেয়া</span><b className="neg">{bdt(s.supplier_due)}</b></div>
            <div><span>বিজ্ঞাপন ও অন্যান্য খরচ</span><b>{bdt(s.total_expenses)}</b></div>
            <div><span>গ্রস প্রফিট</span><b className={s.total_sales - s.total_cogs < 0 ? "neg" : "pos"}>{bdt(s.total_sales - s.total_cogs)}</b></div>
            <div><span>নেট প্রফিট</span><b className={s.net_profit < 0 ? "neg" : "pos"}>{bdt(s.net_profit)}</b></div>
            <div><span>Cash in Hand</span><b>{bdt(bal.Cash)}</b></div>
            <div><span>Bank Balance</span><b>{bdt(bal.Bank)}</b></div>
            <div><span>bKash + Nagad ব্যালেন্স</span><b>{bdt((bal.bKash || 0) + (bal.Nagad || 0))}</b></div>
          </div>
          <p className="dv-note">
            মনে রাখবে: মোট বিক্রি, হাতে পাওয়া টাকা এবং লাভ — তিনটি আলাদা হিসাব। "সংগৃহীত" = মোট বিক্রি − COD বকেয়া − অনলাইন যাচাই বাকি।
            ক্যাশ/ব্যাংক ব্যালেন্স আসে Expenses & Cashbook এর এন্ট্রি থেকে।
          </p>
        </Panel>
      )}

      {/* E. Top products + categories */}
      {ov && (
        <div className="dv-grid-2">
          <Panel title="Top Selling Products">
            {ov.top_products.length === 0 ? (
              <div className="dv-empty">এখনো কোনো বিক্রি নেই।</div>
            ) : (
              <div className="dv-table-wrap">
                <table className="dv-table">
                  <thead>
                    <tr><th>#</th><th>Product</th><th className="num">বিক্রি (পিস)</th><th className="num">আয়</th><th>Stock</th></tr>
                  </thead>
                  <tbody>
                    {ov.top_products.map((p, i) => (
                      <tr key={p.id || i}>
                        <td>{i + 1}</td>
                        <td className="wrap">{p.name}</td>
                        <td className="num">{p.qty}</td>
                        <td className="num">{bdt(p.revenue)}</td>
                        <td>
                          <span className={`dv-pill ${p.stock <= 0 ? "cancelled" : p.stock <= ov.low_stock_limit ? "pending" : "delivered"}`}>
                            {p.stock}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Best Selling Categories">
            {ov.top_categories.length === 0 ? (
              <div className="dv-empty">ক্যাটাগরি অনুযায়ী বিক্রির তথ্য পাওয়া যায়নি।</div>
            ) : (
              ov.top_categories.map((c) => (
                <div className="dv-hbar" key={c.name}>
                  <span className="dv-hbar-label">{c.name}</span>
                  <div className="dv-hbar-track">
                    <div className="dv-hbar-fill" style={{ width: `${(c.revenue / maxCatSales) * 100}%` }} />
                  </div>
                  <span className="dv-hbar-value">{bdt(c.revenue)}</span>
                </div>
              ))
            )}
          </Panel>
        </div>
      )}

      {/* Category stock + low stock alert */}
      {ov && (
        <div className="dv-grid-2">
          <Panel title="Category-wise Stock">
            {ov.category_stock.length === 0 ? (
              <div className="dv-empty">ক্যাটাগরি অনুযায়ী স্টকের তথ্য পাওয়া যায়নি।</div>
            ) : (
              ov.category_stock.map((c) => (
                <div className="dv-hbar" key={c.name}>
                  <span className="dv-hbar-label">{c.name}</span>
                  <div className="dv-hbar-track">
                    <div className="dv-hbar-fill alt" style={{ width: `${(c.units / maxCatStock) * 100}%` }} />
                  </div>
                  <span className="dv-hbar-value">{c.units} পিস ({c.products} পণ্য)</span>
                </div>
              ))
            )}
          </Panel>

          <Panel title="⚠ Low Stock & Out of Stock Alert">
            {ov.low_list.length === 0 ? (
              <div className="dv-empty">সব পণ্যের স্টক ঠিক আছে 🎉</div>
            ) : (
              <div className="dv-table-wrap">
                <table className="dv-table">
                  <thead><tr><th>Product</th><th className="num">Stock</th><th>অবস্থা</th></tr></thead>
                  <tbody>
                    {ov.low_list.map((p) => (
                      <tr key={p.id}>
                        <td className="wrap">{p.name}</td>
                        <td className="num">{p.stock}</td>
                        <td>
                          <span className={`dv-pill ${p.stock <= 0 ? "cancelled" : "pending"}`}>
                            {p.stock <= 0 ? "Stock Out" : "Low"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* F. Recent orders */}
      {ov && (
        <Panel
          title="Recent Orders"
          right={<button className="dv-link" onClick={() => go("orders", "/admin-orders")}>View All ›</button>}
        >
          {ov.recent_orders.length === 0 ? (
            <div className="dv-empty">এখনো কোনো অর্ডার নেই।</div>
          ) : (
            <div className="dv-table-wrap">
              <table className="dv-table">
                <thead>
                  <tr>
                    <th>Order ID</th><th>Customer</th><th>Payment</th><th className="num">Amount</th>
                    <th>Payment Status</th><th>Order Status</th><th>তারিখ</th>
                  </tr>
                </thead>
                <tbody>
                  {ov.recent_orders.map((o) => (
                    <tr key={o.id}>
                      <td>#{o.id}</td>
                      <td>{o.customer_name}</td>
                      <td>{o.payment_method}</td>
                      <td className="num">{bdt(o.amount)}</td>
                      <td>{o.payment_status}</td>
                      <td><span className={`dv-pill ${String(o.order_status).toLowerCase()}`}>{o.order_status}</span></td>
                      <td>{String(o.created_at).slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* Quick actions */}
      <Panel title="Quick Actions">
        <div className="dv-actions">
          <button className="dv-btn" onClick={() => go("add-product", "/admin/add-product")}>➕ Add Product</button>
          <button className="dv-btn" onClick={() => go("orders", "/admin-orders")}>📦 Manage Orders</button>
          <button className="dv-btn" onClick={() => go("acc-expenses")}>💸 Add Expense</button>
          <button className="dv-btn" onClick={() => go("acc-report")}>📈 View Reports</button>
        </div>
      </Panel>
    </div>
  );
}