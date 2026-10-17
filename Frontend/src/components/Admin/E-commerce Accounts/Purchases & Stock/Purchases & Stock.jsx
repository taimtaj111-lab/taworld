import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./Purchases & Stock.css";

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

const emptyForm = () => ({
  purchase_date: todayStr(),
  supplier_name: "",
  product_id: "",
  product_name: "",
  quantity: "",
  unit_cost: "",
  paid_amount: "",
  update_stock: true,
  note: "",
});

function Card({ label, value, sub, kind = "" }) {
  return (
    <div className={`acc-card ${kind}`}>
      <div className="acc-card-label">{label}</div>
      <div className="acc-card-value">{value}</div>
      {sub ? <div className="acc-card-sub">{sub}</div> : null}
    </div>
  );
}

export default function PurchasesStock() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [tab, setTab] = useState("purchases");
  const [form, setForm] = useState(emptyForm());
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiCall("purchases_stock"));
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

  const total = (Number(form.quantity) || 0) * (Number(form.unit_cost) || 0);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => {
      const next = { ...prev, [name]: type === "checkbox" ? checked : value };
      if (name === "product_id" && value !== "") next.product_name = "";
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const qty = Number(form.quantity);
    const unit = Number(form.unit_cost);
    const paid = Number(form.paid_amount) || 0;

    if (!form.supplier_name.trim()) return setMsg({ type: "error", text: "সরবরাহকারীর নাম দিন।" });
    if (!form.product_id && !form.product_name.trim()) return setMsg({ type: "error", text: "পণ্য নির্বাচন করুন অথবা পণ্যের নাম লিখুন।" });
    if (!Number.isInteger(qty) || qty <= 0) return setMsg({ type: "error", text: "সঠিক পরিমাণ (পূর্ণ সংখ্যা) দিন।" });
    if (!(unit > 0)) return setMsg({ type: "error", text: "প্রতি পিসের ক্রয়মূল্য দিন।" });
    if (paid < 0 || paid > total + 0.001) return setMsg({ type: "error", text: "পরিশোধিত টাকা মোট টাকার বেশি হতে পারে না।" });

    setSaving(true);
    setMsg(null);
    try {
      await apiCall("add_purchase", {
        purchase_date: form.purchase_date,
        supplier_name: form.supplier_name.trim(),
        product_id: form.product_id || null,
        product_name: form.product_name.trim(),
        quantity: qty,
        unit_cost: unit,
        paid_amount: paid,
        update_stock: form.update_stock,
        note: form.note.trim(),
      });
      setMsg({ type: "success", text: "ক্রয় এন্ট্রি সংরক্ষণ হয়েছে।" });
      setForm(emptyForm());
      await load();
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const payPurchase = async (p) => {
    const input = window.prompt(`কত টাকা পরিশোধ করবেন? (বকেয়া: ${bdt(p.due)})`, String(p.due));
    if (input === null) return;

    const amount = Number(input);
    if (!(amount > 0) || amount > p.due + 0.001) {
      setMsg({ type: "error", text: "সঠিক টাকার পরিমাণ দিন (বকেয়ার বেশি হবে না)।" });
      return;
    }

    try {
      await apiCall("pay_purchase", { id: p.id, amount });
      setMsg({ type: "success", text: "সরবরাহকারীর পেমেন্ট সংরক্ষণ হয়েছে।" });
      await load();
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: err.message });
    }
  };

  const deletePurchase = async (p) => {
    const extra = p.stock_added ? "\n(এই ক্রয়ের স্টকও কমে যাবে)" : "";
    if (!window.confirm(`এই ক্রয় এন্ট্রি মুছবেন?${extra}`)) return;

    try {
      await apiCall("delete_purchase", { id: p.id });
      setMsg({ type: "success", text: "ক্রয় এন্ট্রি মুছে ফেলা হয়েছে।" });
      await load();
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: err.message });
    }
  };

  const filteredStock = useMemo(() => {
    const list = data?.products || [];
    const q = search.trim().toLowerCase();
    return q ? list.filter((p) => String(p.product_name).toLowerCase().includes(q)) : list;
  }, [data, search]);

  if (loading && !data) return <div className="acc-loading">লোড হচ্ছে…</div>;
  if (!data) {
    return (
      <div className="acc-page">
        {msg ? <div className={`acc-msg ${msg.type}`}>{msg.text}</div> : null}
        <button className="acc-btn" onClick={load}>আবার চেষ্টা করুন</button>
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="acc-page">
      <div className="acc-head">
        <h2 className="acc-title">📦 Purchases & Stock</h2>
        <button className="acc-btn secondary" onClick={load} disabled={loading}>
          {loading ? "রিফ্রেশ হচ্ছে…" : "🔄 রিফ্রেশ"}
        </button>
      </div>

      <div className="acc-cards">
        <Card label="মোট ক্রয়" value={bdt(s.total_purchase)} kind="info" />
        <Card label="মোট পরিশোধ" value={bdt(s.total_paid)} kind="good" />
        <Card label="সরবরাহকারীর বকেয়া" value={bdt(s.supplier_due)} kind="bad" />
        <Card label="অবশিষ্ট পণ্য (পিস)" value={s.stock_qty} />
        <Card label="স্টকের ক্রয়মূল্য" value={bdt(s.stock_cost_value)} kind="good" />
        <Card label="স্টকের বিক্রয়মূল্য" value={bdt(s.stock_sell_value)} kind="info" />
      </div>

      {msg ? <div className={`acc-msg ${msg.type}`}>{msg.text}</div> : null}

      <div className="acc-tabs">
        <button className={`acc-tab ${tab === "purchases" ? "active" : ""}`} onClick={() => setTab("purchases")}>পণ্য ক্রয়</button>
        <button className={`acc-tab ${tab === "suppliers" ? "active" : ""}`} onClick={() => setTab("suppliers")}>সরবরাহকারীর বকেয়া</button>
        <button className={`acc-tab ${tab === "stock" ? "active" : ""}`} onClick={() => setTab("stock")}>অবশিষ্ট স্টক</button>
      </div>

      {tab === "purchases" && (
        <>
          <div className="acc-panel">
            <h3>➕ নতুন ক্রয় এন্ট্রি</h3>
            <form onSubmit={handleSubmit}>
              <div className="acc-form">
                <label className="acc-field">
                  তারিখ
                  <input className="acc-input" type="date" name="purchase_date" value={form.purchase_date} onChange={handleChange} required />
                </label>

                <label className="acc-field">
                  সরবরাহকারী *
                  <input className="acc-input" name="supplier_name" value={form.supplier_name} onChange={handleChange} maxLength={150} placeholder="যেমন: রহিম ট্রেডার্স" />
                </label>

                <label className="acc-field">
                  পণ্য (স্টোর থেকে)
                  <select className="acc-input" name="product_id" value={form.product_id} onChange={handleChange}>
                    <option value="">-- স্টোরে নেই / অন্য পণ্য --</option>
                    {(data.products || []).map((p) => (
                      <option key={p.id} value={p.id}>{p.product_name} (স্টক: {p.stock})</option>
                    ))}
                  </select>
                </label>

                {!form.product_id && (
                  <label className="acc-field">
                    পণ্যের নাম *
                    <input className="acc-input" name="product_name" value={form.product_name} onChange={handleChange} maxLength={255} />
                  </label>
                )}

                <label className="acc-field">
                  পরিমাণ (পিস) *
                  <input className="acc-input" type="number" name="quantity" value={form.quantity} onChange={handleChange} min="1" step="1" />
                </label>

                <label className="acc-field">
                  প্রতি পিস ক্রয়মূল্য (৳) *
                  <input className="acc-input" type="number" name="unit_cost" value={form.unit_cost} onChange={handleChange} min="0.01" step="0.01" />
                </label>

                <label className="acc-field">
                  এখনই পরিশোধ (৳)
                  <input className="acc-input" type="number" name="paid_amount" value={form.paid_amount} onChange={handleChange} min="0" step="0.01" placeholder="0" />
                </label>

                <label className="acc-field full">
                  নোট
                  <input className="acc-input" name="note" value={form.note} onChange={handleChange} maxLength={500} />
                </label>

                {form.product_id && (
                  <label className="acc-check full">
                    <input type="checkbox" name="update_stock" checked={form.update_stock} onChange={handleChange} />
                    এই পরিমাণ পণ্যের স্টকে যোগ হবে
                  </label>
                )}

                <div className="acc-total-line">
                  মোট: {bdt(total)} | বকেয়া: {bdt(Math.max(total - (Number(form.paid_amount) || 0), 0))}
                </div>
              </div>

              <button className="acc-btn success" type="submit" disabled={saving}>
                {saving ? "সংরক্ষণ হচ্ছে…" : "ক্রয় সংরক্ষণ করুন"}
              </button>
            </form>
          </div>

          <div className="acc-panel">
            <h3>ক্রয়ের তালিকা</h3>
            {data.purchases.length === 0 ? (
              <div className="acc-empty">এখনো কোনো ক্রয় এন্ট্রি নেই।</div>
            ) : (
              <div className="acc-table-wrap">
                <table className="acc-table">
                  <thead>
                    <tr>
                      <th>তারিখ</th>
                      <th>সরবরাহকারী</th>
                      <th>পণ্য</th>
                      <th className="num">পরিমাণ</th>
                      <th className="num">প্রতি পিস</th>
                      <th className="num">মোট</th>
                      <th className="num">পরিশোধ</th>
                      <th className="num">বকেয়া</th>
                      <th>অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.purchases.map((p) => (
                      <tr key={p.id}>
                        <td>{p.purchase_date}</td>
                        <td>{p.supplier_name}</td>
                        <td className="wrap">{p.product_name}</td>
                        <td className="num">{p.quantity}</td>
                        <td className="num">{bdt(p.unit_cost)}</td>
                        <td className="num">{bdt(p.total_cost)}</td>
                        <td className="num">{bdt(p.paid_amount)}</td>
                        <td className="num">
                          {p.due > 0 ? <span className="neg">{bdt(p.due)}</span> : <span className="acc-badge paid">Paid</span>}
                        </td>
                        <td>
                          <div className="acc-actions">
                            {p.due > 0 && (
                              <button className="acc-btn small success" onClick={() => payPurchase(p)}>পরিশোধ</button>
                            )}
                            <button className="acc-btn small danger" onClick={() => deletePurchase(p)}>Delete</button>
                          </div>
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

      {tab === "suppliers" && (
        <div className="acc-panel">
          <h3>সরবরাহকারী অনুযায়ী বকেয়া</h3>
          {data.suppliers.length === 0 ? (
            <div className="acc-empty">কোনো সরবরাহকারী নেই।</div>
          ) : (
            <div className="acc-table-wrap">
              <table className="acc-table">
                <thead>
                  <tr>
                    <th>সরবরাহকারী</th>
                    <th className="num">ক্রয় সংখ্যা</th>
                    <th className="num">মোট ক্রয়</th>
                    <th className="num">পরিশোধ</th>
                    <th className="num">বকেয়া</th>
                  </tr>
                </thead>
                <tbody>
                  {data.suppliers.map((r) => (
                    <tr key={r.supplier_name}>
                      <td>{r.supplier_name}</td>
                      <td className="num">{r.purchases_count}</td>
                      <td className="num">{bdt(r.total)}</td>
                      <td className="num">{bdt(r.paid)}</td>
                      <td className={`num ${r.due > 0 ? "neg" : "pos"}`}>{bdt(r.due)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>মোট</td>
                    <td />
                    <td className="num">{bdt(s.total_purchase)}</td>
                    <td className="num">{bdt(s.total_paid)}</td>
                    <td className="num neg">{bdt(s.supplier_due)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <p className="acc-note">বকেয়া মেটাতে "পণ্য ক্রয়" ট্যাবের তালিকায় সংশ্লিষ্ট ক্রয়ের পাশে "পরিশোধ" বাটনে ক্লিক করুন।</p>
        </div>
      )}

      {tab === "stock" && (
        <div className="acc-panel">
          <h3>অবশিষ্ট স্টক ও মূল্য</h3>
          <input
            className="acc-input"
            style={{ maxWidth: 320, marginBottom: 12 }}
            placeholder="পণ্য খুঁজুন…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {filteredStock.length === 0 ? (
            <div className="acc-empty">কোনো পণ্য পাওয়া যায়নি।</div>
          ) : (
            <div className="acc-table-wrap">
              <table className="acc-table">
                <thead>
                  <tr>
                    <th>পণ্য</th>
                    <th className="num">স্টক</th>
                    <th className="num">গড় ক্রয়মূল্য</th>
                    <th className="num">স্টকের ক্রয়মূল্য</th>
                    <th className="num">বিক্রয়মূল্য</th>
                    <th className="num">স্টকের বিক্রয়মূল্য</th>
                    <th>অবস্থা</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.map((p) => (
                    <tr key={p.id}>
                      <td className="wrap">{p.product_name}</td>
                      <td className="num">{p.stock}</td>
                      <td className="num">{p.avg_cost > 0 ? bdt(p.avg_cost) : "—"}</td>
                      <td className="num">{bdt(p.cost_value)}</td>
                      <td className="num">{bdt(p.sell_price)}</td>
                      <td className="num">{bdt(p.sell_value)}</td>
                      <td>
                        {p.stock <= 0 ? (
                          <span className="acc-badge none">Stock Out</span>
                        ) : p.stock <= 5 ? (
                          <span className="acc-badge low">Low</span>
                        ) : (
                          <span className="acc-badge paid">OK</span>
                        )}{" "}
                        {p.avg_cost <= 0 ? <span className="acc-badge low">ক্রয়মূল্য নেই</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>মোট</td>
                    <td className="num">{s.stock_qty}</td>
                    <td />
                    <td className="num">{bdt(s.stock_cost_value)}</td>
                    <td />
                    <td className="num">{bdt(s.stock_sell_value)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <p className="acc-note">"ক্রয়মূল্য নেই" মানে ওই পণ্যের কোনো ক্রয় এন্ট্রি দেওয়া হয়নি, তাই স্টকের ক্রয়মূল্য ও লাভের হিসাবে ওই পণ্যের খরচ ০ ধরা হচ্ছে।</p>
        </div>
      )}
    </div>
  );
}