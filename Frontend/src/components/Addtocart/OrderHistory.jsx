import React, { useEffect, useState } from "react";
import "./OrderHistory.css";
import { FaChevronDown, FaChevronUp, FaTimes } from "react-icons/fa";

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [stats, setStats] = useState({
    total_orders: 0,
    total_sales: 0,
    active_orders: 0,
  });
// ফাইলগুলো সরাসরি htdocs এ মুভ করলে এই লিঙ্কটি ব্যবহার করুন:
const API_URL = "http://localhost/tajworld/Backend/backend/Cart/order_list.php";
const STATS_URL = "http://localhost/tajworld/Backend/backend/Orders/order_statistics.php";
const STATUS_UPDATE_URL = "http://localhost/tajworld/Backend/backend/Orders/update_order_status.php";

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const [ordersResponse, statsResponse] = await Promise.all([
        fetch(API_URL),
        fetch(STATS_URL),
      ]);

      if (!ordersResponse.ok) {
        throw new Error(`Orders API error: ${ordersResponse.status}`);
      }

      const orderData = await ordersResponse.json();
      const sorted = Array.isArray(orderData)
        ? [...orderData].sort((a, b) => Number(b.id) - Number(a.id))
        : [];
      setOrders(sorted);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData?.success) {
          setStats({
            total_orders: Number(statsData.total_orders) || 0,
            total_sales: Number(statsData.total_sales) || 0,
            active_orders: Number(statsData.active_orders) || 0,
          });
        }
      }
    } catch (err) {
      console.error("Fetch Orders Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    window.addEventListener("order-placed", fetchOrders);
    return () => window.removeEventListener("order-placed", fetchOrders);
  }, []);

  const parseItems = (itemsString) => {
    if (!itemsString) return [];
    try {
      return typeof itemsString === "string" ? JSON.parse(itemsString) : itemsString;
    } catch {
      return [];
    }
  };

  const getProductSummary = (itemsString) => {
    const items = parseItems(itemsString);
    if (!items || items.length === 0) return "No products";
    return items.map(i => i.selectedSize ? `${i.product_name} (${i.selectedSize})` : i.product_name).join(", ");
  };

  const cancelOrder = async (id) => {
    const orderToCancel = orders.find((o) => o.id === id);
    if (orderToCancel.order_status !== "Pending") {
      alert(`Order #${id} cannot be cancelled.`);
      return;
    }
    if (!window.confirm(`আপনি কি নিশ্চিত যে অর্ডার #${id} বাতিল করতে চান?`)) return;

    try {
      const res = await fetch(STATUS_UPDATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "Cancelled" }),
      });
      const data = await res.json();
      if (data.success) fetchOrders();
      else alert("Failed: " + data.message);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleExpand = (id) => setExpandedOrder(prev => (prev === id ? null : id));

  const getStatusClass = (s) => {
    const status = s.toLowerCase();
    if (status === "delivered" || status === "completed") return "status-delivered";
    if (status === "cancelled" || status === "failed") return "status-cancelled";
    if (status === "processing" || status === "shipped") return "status-processing";
    return "status-pending";
  };

  return (
    <div className="order-history-container">
      <hr className="history-divider" />
      <h2>📜 Your Order History</h2>

      <div className="order-statistics">
        <div className="order-stat-card">
          <span>Total Orders</span>
          <strong>{stats.total_orders}</strong>
        </div>
        <div className="order-stat-card">
          <span>Active Orders</span>
          <strong>{stats.active_orders}</strong>
        </div>
        <div className="order-stat-card">
          <span>Total Sales</span>
          <strong>৳{stats.total_sales.toLocaleString("en-BD", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</strong>
        </div>
      </div>

      {loading ? (
        <p className="loading">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="no-orders">No orders found.</p>
      ) : (
        <table className="history-table">
          <thead>
            <tr>
              <th>Order & Products</th>
              <th>Date</th>
              <th>Total</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <React.Fragment key={o.id}>
                <tr className={`history-row ${expandedOrder === o.id ? "active" : ""}`} onClick={() => toggleExpand(o.id)}>
                  <td data-label="Order">
                    <div className="order-id">#{o.id}</div>
                    <div className="order-products-summary scrollable-x">
                      {getProductSummary(o.items)}
                    </div>
                  </td>
                  <td data-label="Date">{o.date_time ? new Date(o.date_time).toLocaleDateString() : "N/A"}</td>
                  <td data-label="Total">৳{parseFloat(o.total_price ?? o.total_amount ?? 0).toFixed(2)}</td>
                  <td data-label="Status" className={getStatusClass(o.order_status)}>{o.order_status}</td>
                  <td data-label="Payment" className={getStatusClass(o.payment_status)}>{o.payment_status}</td>
                  <td data-label="Action">
                    <div className="action-flex">
                      {o.order_status === "Pending" && (
                        <button className="cancel-btn" onClick={(e) => { e.stopPropagation(); cancelOrder(o.id); }}>
                          <FaTimes /> Cancel
                        </button>
                      )}
                      <span className="expand-icon">
                        {expandedOrder === o.id ? <FaChevronUp /> : <FaChevronDown />}
                      </span>
                    </div>
                  </td>
                </tr>

                {expandedOrder === o.id && (
                  <tr className="details-row">
                    <td colSpan="6">
                      <div className="details-box">
                        <div className="info">
                          <p><b>Name:</b> {o.customer_name} | <b>Phone:</b> {o.phone}</p>
                          <p><b>Address:</b> {o.address}, {o.city}</p>
                        </div>
                        <table className="inner-table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Qty</th>
                              <th>Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parseItems(o.items).map((item, i) => (
                              <tr key={i}>
                                <td>{item.product_name} {item.selectedSize && `(${item.selectedSize})`}</td>
                                <td>{item.quantity}</td>
                                <td>৳{parseFloat(item.price || item.current_price || 0).toFixed(2)}</td>
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
