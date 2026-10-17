import React, { useCallback, useEffect, useState } from "react";
import "./Daily & Monthly Report.css";

const API = "http://localhost/tajworld/Backend/backend/Accounts/accounts.php";

async function apiGet(action) {
  const res = await fetch(`${API}?action=${action}`);
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
    Math.abs(v).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

const tone = (n) => (Number(n) < 0 ? "neg" : Number(n) > 0 ? "pos" : "");

const monthLabel = (ym) => {
  const [y, m] = String(ym).split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[(Number(m) || 1) - 1]} ${y}`;
};

function Card({ label, value, sub, kind = "" }) {
  return (
    <div className={`acc-card ${kind}`}>
      <div className="acc-card-label">{label}</div>
      <div className="acc-card-value">{value}</div>
      {sub ? <div className="acc-card-sub">{sub}</div> : null}
    </div>
  );
}

export default function DailyMonthlyReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("daily");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await apiGet("report"));
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <div className="acc-loading">রিপোর্ট লোড হচ্ছে…</div>;

  if (error && !data) {
    return (
      <div className="acc-page">
        <div className="acc-msg error">{error}</div>
        <button className="acc-btn" onClick={load}>আবার চেষ্টা করুন</button>
      </div>
    );
  }

  if (!data) return null;

  const s = data.summary;
  const daily = data.daily || [];
  const monthly = data.monthly || [];
  const dues = data.dues || [];

  const sum = (rows, key) => rows.reduce((t, r) => t + (Number(r[key]) || 0), 0);
  const maxMonthSales = Math.max(...monthly.map((m) => m.sales), 0);

  return (
    <div className="acc-page">
      <div className="acc-head">
        <h2 className="acc-title">📊 Daily & Monthly Report</h2>
        <button className="acc-btn secondary" onClick={load} disabled={loading}>
          {loading ? "রিফ্রেশ হচ্ছে…" : "🔄 রিফ্রেশ"}
        </button>
      </div>

      {error ? <div className="acc-msg error">{error}</div> : null}

      <div className="acc-cards">
        <Card label="মোট বিক্রি (Total Sales)" value={bdt(s.total_sales)} sub={`${s.valid_orders} টি বৈধ অর্ডার`} />
        <Card label="মোট লাভ / ক্ষতি (Net Profit)" value={bdt(s.net_profit)} kind={s.net_profit < 0 ? "bad" : "good"} sub="বিক্রি − পণ্যের খরচ − অন্যান্য খরচ" />
        <Card label="আজকের বিক্রি" value={bdt(s.today_sales)} sub={`লাভ: ${bdt(s.today_profit)}`} kind="info" />
        <Card label="এই মাসের বিক্রি" value={bdt(s.month_sales)} sub={`লাভ: ${bdt(s.month_profit)}`} kind="info" />
        <Card label="মোট খরচ (Ads, Delivery ইত্যাদি)" value={bdt(s.total_expenses)} kind="warn" />
        <Card label="পণ্যের ক্রয়মূল্য (COGS)" value={bdt(s.total_cogs)} kind="warn" sub="বিক্রি হওয়া পণ্যের গড় ক্রয়মূল্য" />
        <Card label="COD বকেয়া" value={bdt(s.cod_due)} kind="bad" sub={`${s.cod_count} টি অর্ডার`} />
        <Card label="অনলাইন পেমেন্ট যাচাই বাকি" value={bdt(s.online_pending)} kind="warn" sub={`${s.online_count} টি অর্ডার`} />
        <Card label="সরবরাহকারীর বকেয়া" value={bdt(s.supplier_due)} kind="bad" />
        <Card label="অবশিষ্ট স্টক (ক্রয়মূল্য)" value={bdt(s.stock_cost_value)} sub={`${s.stock_qty} পিস | বিক্রয়মূল্য ${bdt(s.stock_sell_value)}`} kind="good" />
        <Card label="ক্যাশ / ব্যাংক মোট ব্যালেন্স" value={bdt(s.cash_total)} kind={s.cash_total < 0 ? "bad" : "good"} sub={Object.entries(s.balances || {}).map(([k, v]) => `${k}: ${bdt(v)}`).join(" | ")} />
        <Card label="বাতিল অর্ডার" value={s.cancelled_orders} sub={`মোট অর্ডার ${s.total_orders}`} />
      </div>

      <div className="acc-tabs">
        <button className={`acc-tab ${tab === "daily" ? "active" : ""}`} onClick={() => setTab("daily")}>দৈনিক (৩১ দিন)</button>
        <button className={`acc-tab ${tab === "monthly" ? "active" : ""}`} onClick={() => setTab("monthly")}>মাসিক (১২ মাস)</button>
        <button className={`acc-tab ${tab === "dues" ? "active" : ""}`} onClick={() => setTab("dues")}>কাস্টমার বকেয়া ও COD</button>
      </div>

      <div className="acc-panel">
        {tab === "daily" && (
          <div className="acc-table-wrap">
            <table className="acc-table">
              <thead>
                <tr>
                  <th>তারিখ</th>
                  <th className="num">অর্ডার</th>
                  <th className="num">বিক্রি</th>
                  <th className="num">পণ্যের খরচ</th>
                  <th className="num">অন্যান্য খরচ</th>
                  <th className="num">লাভ / ক্ষতি</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((r) => (
                  <tr key={r.date}>
                    <td>{r.date}</td>
                    <td className="num">{r.orders}</td>
                    <td className="num">{bdt(r.sales)}</td>
                    <td className="num">{bdt(r.cogs)}</td>
                    <td className="num">{bdt(r.expenses)}</td>
                    <td className={`num ${tone(r.profit)}`}>{bdt(r.profit)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>৩১ দিনের মোট</td>
                  <td className="num">{sum(daily, "orders")}</td>
                  <td className="num">{bdt(sum(daily, "sales"))}</td>
                  <td className="num">{bdt(sum(daily, "cogs"))}</td>
                  <td className="num">{bdt(sum(daily, "expenses"))}</td>
                  <td className={`num ${tone(sum(daily, "profit"))}`}>{bdt(sum(daily, "profit"))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {tab === "monthly" && (
          <div className="acc-table-wrap">
            <table className="acc-table">
              <thead>
                <tr>
                  <th>মাস</th>
                  <th className="num">অর্ডার</th>
                  <th className="num">বিক্রি</th>
                  <th className="num">পণ্যের খরচ</th>
                  <th className="num">অন্যান্য খরচ</th>
                  <th className="num">লাভ / ক্ষতি</th>
                  <th>বিক্রির গ্রাফ</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((r) => (
                  <tr key={r.month}>
                    <td>{monthLabel(r.month)}</td>
                    <td className="num">{r.orders}</td>
                    <td className="num">{bdt(r.sales)}</td>
                    <td className="num">{bdt(r.cogs)}</td>
                    <td className="num">{bdt(r.expenses)}</td>
                    <td className={`num ${tone(r.profit)}`}>{bdt(r.profit)}</td>
                    <td style={{ minWidth: 120 }}>
                      <div className="acc-bar">
                        <span style={{ width: `${maxMonthSales > 0 ? (r.sales / maxMonthSales) * 100 : 0}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>১২ মাসের মোট</td>
                  <td className="num">{sum(monthly, "orders")}</td>
                  <td className="num">{bdt(sum(monthly, "sales"))}</td>
                  <td className="num">{bdt(sum(monthly, "cogs"))}</td>
                  <td className="num">{bdt(sum(monthly, "expenses"))}</td>
                  <td className={`num ${tone(sum(monthly, "profit"))}`}>{bdt(sum(monthly, "profit"))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {tab === "dues" && (
          <>
            <p className="acc-note">
              যেসব অর্ডারের Payment Status <b>Pending / Failed</b> সেগুলো এখানে আসে। COD হলে টাকা এখনো হাতে আসেনি,
              bKash / Nagad / Bank হলে পেমেন্ট যাচাই বাকি। Orders পেজে Payment Status "Completed" করলে এখান থেকে সরে যাবে।
            </p>
            {dues.length === 0 ? (
              <div className="acc-empty">কোনো বকেয়া নেই 🎉</div>
            ) : (
              <div className="acc-table-wrap">
                <table className="acc-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>কাস্টমার</th>
                      <th>ফোন</th>
                      <th>পেমেন্ট</th>
                      <th>Order Status</th>
                      <th>Payment Status</th>
                      <th className="num">টাকা</th>
                      <th>তারিখ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dues.map((r) => (
                      <tr key={r.id}>
                        <td>#{r.id}</td>
                        <td>{r.customer_name}</td>
                        <td>{r.phone}</td>
                        <td>
                          <span className={`acc-badge ${r.payment_method === "COD" ? "cod" : "online"}`}>{r.payment_method}</span>
                        </td>
                        <td>{r.order_status}</td>
                        <td>{r.payment_status}</td>
                        <td className="num">{bdt(r.amount)}</td>
                        <td>{String(r.created_at || "").slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <p className="acc-note">
        হিসাবের নিয়ম: বিক্রি = বাতিল/Refunded নয় এমন অর্ডারের মোট টাকা (ডেলিভারি চার্জসহ)। পণ্যের খরচ = বিক্রিত পরিমাণ × গড় ক্রয়মূল্য
        (Purchases & Stock এ যে পণ্যের ক্রয় এন্ট্রি দেওয়া আছে)। ক্রয় এন্ট্রি না থাকলে ওই পণ্যের খরচ ০ ধরা হয়।
      </p>
    </div>
  );
}