// src/components/Admin/Orders/OrderList.jsx
import React, { useEffect, useState } from "react";
import "./OrderList.css";

// Everything goes through this one existing PHP file
const ORDERS_API = "http://localhost/tajworld/Backend/backend/Orders/GetOrders.php";

const ORDER_STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
const PAYMENT_STATUSES = ["Pending", "Completed", "Failed", "Refunded"];

async function apiRequest(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("Non-JSON response:", text);
    throw new Error("The server returned an invalid response. Check the PHP error log.");
  }

  if (!res.ok || data?.success === false || data?.error) {
    throw new Error(data?.message || data?.error || `Request failed (HTTP ${res.status}).`);
  }

  return data;
}

function postAction(action, body) {
  return apiRequest(ORDERS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
}

const money = (value) => `৳${(parseFloat(value) || 0).toFixed(2)}`;

// Payment time: DB column first, otherwise the time the customer typed (saved in note)
const getPaymentTime = (order) => {
  if (order.payment_time) return order.payment_time;

  const match = /Payment time \(entered by customer\):\s*(.+)/i.exec(order.note || "");
  return match ? match[1].trim() : "";
};

const methodLabel = (method) => {
  if (method === "COD") return "Cash on Delivery";
  if (method === "Bank") return "Bank Transfer";
  return method || "N/A";
};

const methodColor = (method) => {
  if (method === "bKash") return "#e2136e";
  if (method === "Nagad") return "#f26722";
  if (method === "Bank") return "#0b5ed7";
  return "#198754"; // COD
};

function PaymentInfo({ order, full = false }) {
  const method = order.payment_method || "COD";
  const isCOD = method === "COD";
  const time = getPaymentTime(order);

  return (
    <div style={{ fontSize: "13px", lineHeight: 1.5, textAlign: "left" }}>
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: "10px",
          color: "#fff",
          fontWeight: 600,
          background: methodColor(method),
        }}
      >
        {methodLabel(method)}
      </span>

      {isCOD ? (
        <div>Pay on delivery</div>
      ) : (
        <>
          {method === "Bank" && order.payment_bank_name ? (
            <div><b>Bank:</b> {order.payment_bank_name}</div>
          ) : null}

          <div>
            <b>{method === "Bank" ? "Sender Acc:" : `${method} No:`}</b>{" "}
            {order.payment_sender_number || "N/A"}
          </div>

          <div><b>TrxID/Ref:</b> {order.payment_reference || "N/A"}</div>

          {full && (
            <>
              <div><b>Amount:</b> {money(order.payment_amount)}</div>
              <div><b>Time:</b> {time || "N/A"}</div>
            </>
          )}
        </>
      )}
    </div>
  );
}

const editInputStyle = {
  padding: "8px",
  border: "1px solid #ccc",
  borderRadius: "6px",
  width: "100%",
  boxSizing: "border-box",
};

export default function OrderList({ onOrderCountChange }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(ORDERS_API);
      if (!Array.isArray(data)) throw new Error("Unexpected response from server.");
      setOrders(data);
    } catch (err) {
      console.error("Fetch Orders Error:", err);
      alert("Failed to fetch orders: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Keep the pending-orders badge in sync with the list
  useEffect(() => {
    if (onOrderCountChange) {
      onOrderCountChange(orders.filter((o) => o.order_status === "Pending").length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  // ---------- Order / delivery status ----------
  const updateOrderStatus = async (id, status) => {
    const previous = orders;
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, order_status: status } : o)));

    try {
      await postAction("update_order_status", { id, status });
    } catch (err) {
      console.error(err);
      setOrders(previous);
      alert("Order status update failed: " + err.message);
    }
  };

  // ---------- Payment status ----------
  const updatePaymentStatus = async (id, payment_status) => {
    const previous = orders;
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, payment_status } : o)));

    try {
      await postAction("update_payment_status", { id, payment_status });
    } catch (err) {
      console.error(err);
      setOrders(previous);
      alert("Payment status update failed: " + err.message);
    }
  };

  // ---------- Delete ----------
  const deleteOrder = async (id) => {
    if (!window.confirm("Are you sure to delete this order? This action cannot be undone.")) return;

    try {
      await postAction("delete_order", { id });
      setOrders((prev) => prev.filter((o) => o.id !== id));
      if (expandedOrder === id) setExpandedOrder(null);
      if (editingId === id) setEditingId(null);
    } catch (err) {
      console.error(err);
      alert("Delete failed: " + err.message);
    }
  };

  // ---------- Edit customer details ----------
  const startEdit = (order) => {
    setExpandedOrder(order.id);
    setEditingId(order.id);
    setEditForm({
      customer_name: order.customer_name || "",
      customer_email: order.customer_email || "",
      phone: order.phone || "",
      address: order.address || "",
      city: order.city || "",
      postal_code: order.postal_code || "",
      note: order.note || "",
    });
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveEdit = async (id) => {
    if (saving) return;

    const f = editForm;
    if (
      f.customer_name.trim().length < 2 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.customer_email.trim()) ||
      !/^[0-9+\-\s().]{7,30}$/.test(f.phone.trim()) ||
      f.address.trim().length < 5 ||
      !f.city.trim()
    ) {
      alert("Please enter a valid name, email, phone, address and city.");
      return;
    }

    setSaving(true);
    try {
      await postAction("update_order", { id, ...f });

      setOrders((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                customer_name: f.customer_name.trim(),
                customer_email: f.customer_email.trim(),
                phone: f.phone.trim(),
                address: f.address.trim(),
                city: f.city.trim(),
                postal_code: f.postal_code.trim(),
                note: f.note.trim(),
              }
            : o
        )
      );
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert("Update failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedOrder((prev) => (prev === id ? null : id));
    if (editingId === id) setEditingId(null);
  };

  const sortedOrders = [...orders].sort((a, b) => a.id - b.id);

  return (
    <div className="order-list-root">
      <h2>📦 Orders</h2>

      {loading ? (
        <p className="loading">Loading orders…</p>
      ) : sortedOrders.length === 0 ? (
        <p className="no-orders">No orders found.</p>
      ) : (
        <table className="orders-summary-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Items Total</th>
              <th>Delivery</th>
              <th>Service</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Order Status</th>
              <th>Payment Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {sortedOrders.map((o) => (
              <React.Fragment key={o.id}>
                <tr
                  className={`order-row ${o.order_status === "Cancelled" ? "row-cancelled" : ""}`}
                  onClick={() => toggleExpand(o.id)}
                >
                  <td>#{o.id}</td>
                  <td>{o.customer_name}</td>
                  <td>{money(o.items_total || o.total_amount)}</td>
                  <td>{money(o.delivery_charge)}</td>
                  <td>{money(o.service_charge)}</td>
                  <td>{money(o.total_price)}</td>

                  <td>
                    <PaymentInfo order={o} />
                  </td>

                  <td>
                    <select
                      value={o.order_status || "Pending"}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <select
                      value={o.payment_status || "Pending"}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updatePaymentStatus(o.id, e.target.value)}
                    >
                      {PAYMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(o);
                      }}
                    >
                      Edit
                    </button>{" "}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteOrder(o.id);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>

                {expandedOrder === o.id && (
                  <tr className="details-row">
                    <td colSpan="10">
                      <div className="details-box">
                        {editingId === o.id ? (
                          <div
                            className="info"
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                              gap: "10px",
                              marginBottom: "12px",
                            }}
                          >
                            <input style={editInputStyle} name="customer_name" placeholder="Name" value={editForm.customer_name} onChange={handleEditChange} maxLength={100} />
                            <input style={editInputStyle} name="customer_email" placeholder="Email" value={editForm.customer_email} onChange={handleEditChange} maxLength={190} />
                            <input style={editInputStyle} name="phone" placeholder="Phone" value={editForm.phone} onChange={handleEditChange} maxLength={30} />
                            <input style={editInputStyle} name="city" placeholder="City" value={editForm.city} onChange={handleEditChange} maxLength={100} />
                            <input style={editInputStyle} name="postal_code" placeholder="Postal Code" value={editForm.postal_code} onChange={handleEditChange} maxLength={30} />
                            <input style={editInputStyle} name="address" placeholder="Address" value={editForm.address} onChange={handleEditChange} maxLength={500} />
                            <textarea style={{ ...editInputStyle, gridColumn: "1 / -1" }} name="note" placeholder="Note" value={editForm.note} onChange={handleEditChange} maxLength={1000} />

                            <div style={{ gridColumn: "1 / -1" }}>
                              <button type="button" disabled={saving} onClick={() => saveEdit(o.id)}>
                                {saving ? "Saving…" : "Save"}
                              </button>{" "}
                              <button type="button" disabled={saving} onClick={() => setEditingId(null)}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="info">
                            <b>Email:</b> {o.customer_email || "N/A"} &nbsp; | &nbsp;
                            <b>Phone:</b> {o.phone || "N/A"} <br />
                            <b>Address:</b> {o.address || ""}, {o.city || ""}, {o.postal_code || ""} <br />
                            <b>Delivery:</b> {o.delivery_type || "N/A"} <br />
                            <b>Note:</b> {o.note || "N/A"}

                            <div style={{ marginTop: "10px" }}>
                              <b>💳 Payment Details</b>
                              <PaymentInfo order={o} full />
                            </div>
                          </div>
                        )}

                        <table className="inner-table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Size</th>
                              <th>Qty</th>
                              <th>Price</th>
                              <th>Line Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(o.items || []).map((item, idx) => (
                              <tr key={item.id ?? idx}>
                                <td>{item.product_name}</td>
                                <td>{item.selected_size || "-"}</td>
                                <td>{item.quantity}</td>
                                <td>{money(item.price)}</td>
                                <td>
                                  {money(
                                    (parseFloat(item.price) || 0) *
                                      (parseInt(item.quantity, 10) || 1)
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}