import React, { useCallback, useEffect, useState } from "react";
import "./Expenses & Cashbook.css";

const API = "http://localhost/tajworld/Backend/backend/Accounts/accounts.php";

async function apiCall(action, body) {
  const isPost = body !== undefined;
  const res = await fetch(isPost ? API : `${API}?action=${action}`, isPost
    ? {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      }
    : undefined);
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

const todayStr = () => new Date().toLocaleDateString("en-CA");

const emptyExpense = () => ({ expense_date: todayStr(), category: "Meta Ads", amount: "", note: "" });
const emptyCash = () => ({ entry_date: todayStr(), account: "Cash", entry_type: "In", amount: "", description: "" });

function Card({ label, value, sub, kind = "" }) {
  return (
    <div className={`acc-card ${kind}`}>
      <div className="acc-card-label">{label}</div>
      <div className="acc-card-value">{value}</div>
      {sub ? <div className="acc-card-sub">{sub}</div> : null}
    </div>
  );
}

export default function ExpensesCashbook() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [tab, setTab] = useState("expenses");
  const [expForm, setExpForm] = useState(emptyExpense());
  const [cashForm, setCashForm] = useState(emptyCash());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiCall("expenses_cashbook"));
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleExp = (e) => setExpForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleCash = (e) => setCashForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submitExpense = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!(Number(expForm.amount) > 0)) return setMsg({ type: "error", text: "সঠিক টাকার পরিমাণ দিন।" });

    setSaving(true);
    setMsg(null);
    try {
      await apiCall("add_expense", { ...expForm, amount: Number(expForm.amount), note: expForm.note.trim() });
      setMsg({ type: "success", text: "খরচ সংরক্ষণ হয়েছে।" });
      setExpForm(emptyExpense());
      await load();
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const submitCash = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!(Number(cashForm.amount) > 0)) return setMsg({ type: "error", text: "সঠিক টাকার পরিমাণ দিন।" });

    setSaving(true);
    setMsg(null);
    try {
      await apiCall("add_cash", { ...cashForm, amount: Number(cashForm.amount), description: cashForm.description.trim() });
      setMsg({ type: "success", text: "ক্যাশবুক এন্ট্রি সংরক্ষণ হয়েছে।" });
      setCashForm(emptyCash());
      await load();
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (action, id, text) => {
    if (!window.confirm(text)) return;

    try {
      await apiCall(action, { id });
      setMsg({ type: "success", text: "মুছে ফেলা হয়েছে।" });
      await load();
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: err.message });
    }
  };

  if (loading && !data) return <div className="acc-loading">লোড হচ্ছে…</div>;
  if (!data) {
    return (
      <div className="acc-page">
        {msg ? <div className={`acc-msg ${msg.type}`}>{msg.text}</div> : null}
        <button className="acc-btn" onClick={load}>আবার চেষ্টা করুন</button>
      </div>
    );
  }

  const categories = data.categories || [];
  const accounts = data.accounts || [];

  return (
    <div className="acc-page">
      <div className="acc-head">
        <h2 className="acc-title">💰 Expenses & Cashbook</h2>
        <button className="acc-btn secondary" onClick={load} disabled={loading}>
          {loading ? "রিফ্রেশ হচ্ছে…" : "🔄 রিফ্রেশ"}
        </button>
      </div>

      <div className="acc-cards">
        <Card label="এই মাসের মোট খরচ" value={bdt(data.expense_month)} kind="warn" />
        <Card label="সর্বমোট খরচ" value={bdt(data.expense_total)} kind="bad" />
        <Card label="ক্যাশবুকে মোট ব্যালেন্স" value={bdt(data.cash_total)} kind={data.cash_total < 0 ? "bad" : "good"} sub={`আয় ${bdt(data.total_in)} | ব্যয় ${bdt(data.total_out)}`} />
        {accounts.map((a) => (
          <Card key={a} label={`${a} ব্যালেন্স`} value={bdt(data.balances?.[a])} kind={(data.balances?.[a] || 0) < 0 ? "bad" : "info"} />
        ))}
      </div>

      {msg ? <div className={`acc-msg ${msg.type}`}>{msg.text}</div> : null}

      <div className="acc-tabs">
        <button className={`acc-tab ${tab === "expenses" ? "active" : ""}`} onClick={() => setTab("expenses")}>খরচ (Ads, Delivery ইত্যাদি)</button>
        <button className={`acc-tab ${tab === "cashbook" ? "active" : ""}`} onClick={() => setTab("cashbook")}>ক্যাশ / ব্যাংক বই</button>
      </div>

      {tab === "expenses" && (
        <>
          <div className="acc-panel">
            <h3>📊 ক্যাটাগরি অনুযায়ী খরচ</h3>
            <div className="acc-table-wrap">
              <table className="acc-table">
                <thead>
                  <tr>
                    <th>ক্যাটাগরি</th>
                    <th className="num">এই মাস</th>
                    <th className="num">সর্বমোট</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c}>
                      <td>{c}</td>
                      <td className="num">{bdt(data.by_category?.[c]?.month)}</td>
                      <td className="num">{bdt(data.by_category?.[c]?.all)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>মোট</td>
                    <td className="num">{bdt(data.expense_month)}</td>
                    <td className="num">{bdt(data.expense_total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="acc-panel">
            <h3>➕ নতুন খরচ</h3>
            <form onSubmit={submitExpense}>
              <div className="acc-form">
                <label className="acc-field">
                  তারিখ
                  <input className="acc-input" type="date" name="expense_date" value={expForm.expense_date} onChange={handleExp} required />
                </label>
                <label className="acc-field">
                  ক্যাটাগরি
                  <select className="acc-input" name="category" value={expForm.category} onChange={handleExp}>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="acc-field">
                  টাকা (৳) *
                  <input className="acc-input" type="number" name="amount" value={expForm.amount} onChange={handleExp} min="0.01" step="0.01" />
                </label>
                <label className="acc-field">
                  নোট
                  <input className="acc-input" name="note" value={expForm.note} onChange={handleExp} maxLength={500} />
                </label>
              </div>
              <button className="acc-btn success" type="submit" disabled={saving}>
                {saving ? "সংরক্ষণ হচ্ছে…" : "খরচ সংরক্ষণ করুন"}
              </button>
            </form>
          </div>

          <div className="acc-panel">
            <h3>খরচের তালিকা</h3>
            {data.expenses.length === 0 ? (
              <div className="acc-empty">এখনো কোনো খরচ নেই।</div>
            ) : (
              <div className="acc-table-wrap">
                <table className="acc-table">
                  <thead>
                    <tr>
                      <th>তারিখ</th>
                      <th>ক্যাটাগরি</th>
                      <th className="num">টাকা</th>
                      <th>নোট</th>
                      <th>অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expenses.map((r) => (
                      <tr key={r.id}>
                        <td>{r.expense_date}</td>
                        <td>{r.category}</td>
                        <td className="num">{bdt(r.amount)}</td>
                        <td className="wrap">{r.note || "—"}</td>
                        <td>
                          <button className="acc-btn small danger" onClick={() => remove("delete_expense", r.id, "এই খরচ মুছবেন?")}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "cashbook" && (
        <>
          <div className="acc-panel">
            <h3>➕ টাকা আসা / যাওয়া</h3>
            <form onSubmit={submitCash}>
              <div className="acc-form">
                <label className="acc-field">
                  তারিখ
                  <input className="acc-input" type="date" name="entry_date" value={cashForm.entry_date} onChange={handleCash} required />
                </label>
                <label className="acc-field">
                  অ্যাকাউন্ট
                  <select className="acc-input" name="account" value={cashForm.account} onChange={handleCash}>
                    {accounts.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </label>
                <label className="acc-field">
                  ধরন
                  <select className="acc-input" name="entry_type" value={cashForm.entry_type} onChange={handleCash}>
                    <option value="In">টাকা এসেছে (In)</option>
                    <option value="Out">টাকা গেছে (Out)</option>
                  </select>
                </label>
                <label className="acc-field">
                  টাকা (৳) *
                  <input className="acc-input" type="number" name="amount" value={cashForm.amount} onChange={handleCash} min="0.01" step="0.01" />
                </label>
                <label className="acc-field full">
                  বিবরণ
                  <input className="acc-input" name="description" value={cashForm.description} onChange={handleCash} maxLength={500} placeholder="যেমন: শুরুর ব্যালেন্স, Order #12 এর টাকা, সরবরাহকারীকে পেমেন্ট" />
                </label>
              </div>
              <button className="acc-btn success" type="submit" disabled={saving}>
                {saving ? "সংরক্ষণ হচ্ছে…" : "এন্ট্রি সংরক্ষণ করুন"}
              </button>
            </form>
          </div>

          <div className="acc-panel">
            <h3>ক্যাশবুকের তালিকা</h3>
            {data.cashbook.length === 0 ? (
              <div className="acc-empty">এখনো কোনো এন্ট্রি নেই। শুরুতে "শুরুর ব্যালেন্স" In হিসেবে দিন।</div>
            ) : (
              <div className="acc-table-wrap">
                <table className="acc-table">
                  <thead>
                    <tr>
                      <th>তারিখ</th>
                      <th>অ্যাকাউন্ট</th>
                      <th>ধরন</th>
                      <th className="num">টাকা</th>
                      <th>বিবরণ</th>
                      <th>অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cashbook.map((r) => (
                      <tr key={r.id}>
                        <td>{r.entry_date}</td>
                        <td>{r.account}</td>
                        <td>
                          <span className={`acc-badge ${r.entry_type === "In" ? "in" : "out"}`}>{r.entry_type === "In" ? "In" : "Out"}</span>
                        </td>
                        <td className={`num ${r.entry_type === "In" ? "pos" : "neg"}`}>
                          {r.entry_type === "In" ? "+" : "-"}{bdt(r.amount)}
                        </td>
                        <td className="wrap">{r.description || "—"}</td>
                        <td>
                          <button className="acc-btn small danger" onClick={() => remove("delete_cash", r.id, "এই এন্ট্রি মুছবেন?")}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}