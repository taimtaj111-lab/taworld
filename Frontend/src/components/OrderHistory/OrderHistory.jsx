
import React, { useState } from "react";
import "./OrderHistory.css";

const API_URL =
  "http://localhost/tajworld/Backend/backend/Orders/OrderHistory.php";

export default function OrderHistory() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");
    setOrders([]);
    setSearched(false);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          phone: phone.trim(),
        }),
      });

      // Read text first so PHP HTML errors don't cause an unexplained
      // "Unexpected token '<'" JSON parsing error.
      const raw = await response.text();

      let data;

      try {
        data = JSON.parse(raw);
      } catch {
        console.error("OrderHistory returned non-JSON:", raw);
        throw new Error(
          "Server returned a PHP error instead of JSON. Check XAMPP error log."
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || data.error || "Unable to load orders."
        );
      }

      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setSearched(true);
    } catch (err) {
      console.error("Fetch Orders Error:", err);
      setError(err.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="order-history-page">
      <div className="order-history-container">
        <h1>My Order History</h1>

        <p className="order-history-subtitle">
          Enter the email and phone number used when placing your order.
        </p>

        <form
          className="order-history-search"
          onSubmit={handleSearch}
        >
          <label htmlFor="history-email">Email address</label>
          <input
            id="history-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            required
          />

          <label htmlFor="history-phone">Phone number</label>
          <input
            id="history-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Enter your phone number"
            autoComplete="tel"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Loading..." : "Find My Orders"}
          </button>
        </form>

        {error && (
          <div className="order-history-error" role="alert">
            {error}
          </div>
        )}

        {searched && orders.length === 0 && !error && (
          <p className="order-history-empty">
            No orders found for these details.
          </p>
        )}

        <section className="order-history-list">
          {orders.map((order) => (
            <article
              className="order-history-card"
              key={order.id}
            >
              <div className="order-history-card-header">
                <div>
                  <h2>Order #{order.id}</h2>
                  <p>
                    {order.created_at
                      ? new Date(
                          String(order.created_at).replace(" ", "T")
                        ).toLocaleString()
                      : "Date unavailable"}
                  </p>
                </div>

                <span className="order-history-status">
                  {order.order_status || "Pending"}
                </span>
              </div>

              <div className="order-history-details">
                <p>
                  <strong>Customer:</strong>{" "}
                  {order.customer_name}
                </p>
                <p>
                  <strong>Payment:</strong>{" "}
                  {order.payment_method || "N/A"}
                </p>
                <p>
                  <strong>Payment status:</strong>{" "}
                  {order.payment_status || "Pending"}
                </p>
                <p>
                  <strong>Delivery:</strong>{" "}
                  {order.delivery_type || "N/A"}
                </p>
                <p className="order-history-address">
                  <strong>Address:</strong>{" "}
                  {[order.address, order.city, order.postal_code]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>

              <h3>Products</h3>

              {Array.isArray(order.items) && order.items.length > 0 ? (
                <div className="order-history-items">
                  {order.items.map((item, index) => (
                    <div
                      className="order-history-item"
                      key={`${order.id}-${item.product_id}-${index}`}
                    >
                      <div>
                        <strong>{item.product_name}</strong>
                        <p>
                          Qty: {item.quantity}
                          {item.selected_size
                            ? ` · Size: ${item.selected_size}`
                            : ""}
                        </p>
                      </div>

                      <span>
                        ৳
                        {(
                          Number(item.price || 0) *
                          Number(item.quantity || 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No product details found.</p>
              )}

              <div className="order-history-total">
                <span>Subtotal</span>
                <strong>
                  ৳{Number(order.total_amount || 0).toFixed(2)}
                </strong>
              </div>

              <div className="order-history-cost">
                <span>Delivery charge</span>
                <span>
                  ৳{Number(order.delivery_charge || 0).toFixed(2)}
                </span>
              </div>

              <div className="order-history-cost">
                <span>Service charge</span>
                <span>
                  ৳{Number(order.service_charge || 0).toFixed(2)}
                </span>
              </div>

              <div className="order-history-total order-history-grand-total">
                <span>Total</span>
                <strong>
                  ৳
                  {Number(
                    order.total_price ?? order.total_amount ?? 0
                  ).toFixed(2)}
                </strong>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}