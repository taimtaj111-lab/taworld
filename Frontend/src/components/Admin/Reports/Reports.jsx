// C:\React Project\project2\src\components\Admin\Reports\Reports.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Bar, Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "./Reports.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE = "https://tutrait.wuaze.com/Admin/Reports"; 

export default function Reports() {
  const [activeTab, setActiveTab] = useState("sales");

  // --- States for all reports ---
  const [salesData, setSalesData] = useState({});
  const [customersData, setCustomersData] = useState({});
  const [productsData, setProductsData] = useState({});
  const [ordersData, setOrdersData] = useState({});
  const [marketingData, setMarketingData] = useState({});
  const [financialData, setFinancialData] = useState({});
  const [analyticsData, setAnalyticsData] = useState({});

  const fetchSalesReport = async () => {
    try {
      const res = await axios.get(`${API_BASE}/get_sales_report.php`);
      setSalesData(res.data);
    } catch (err) {
      console.error("Sales Report Error:", err);
    }
  };

  const fetchCustomersReport = async () => {
    try {
      const res = await axios.get(`${API_BASE}/get_customers_report.php`);
      setCustomersData(res.data);
    } catch (err) {
      console.error("Customers Report Error:", err);
    }
  };

  const fetchProductsReport = async () => {
    try {
      const res = await axios.get(`${API_BASE}/get_products_report.php`);
      setProductsData(res.data);
    } catch (err) {
      console.error("Products Report Error:", err);
    }
  };

  const fetchOrdersReport = async () => {
    try {
      const res = await axios.get(`${API_BASE}/get_orders_report.php`);
      setOrdersData(res.data);
    } catch (err) {
      console.error("Orders Report Error:", err);
    }
  };

  const fetchMarketingReport = async () => {
    try {
      const res = await axios.get(`${API_BASE}/get_marketing_report.php`);
      setMarketingData(res.data);
    } catch (err) {
      console.error("Marketing Report Error:", err);
    }
  };

  const fetchFinancialReport = async () => {
    try {
      const res = await axios.get(`${API_BASE}/get_financial_report.php`);
      setFinancialData(res.data);
    } catch (err) {
      console.error("Financial Report Error:", err);
    }
  };

  const fetchAnalyticsReport = async () => {
    try {
      const res = await axios.get(`${API_BASE}/get_analytics_report.php`);
      setAnalyticsData(res.data);
    } catch (err) {
      console.error("Analytics Report Error:", err);
    }
  };

  useEffect(() => {
    fetchSalesReport();
    fetchCustomersReport();
    fetchProductsReport();
    fetchOrdersReport();
    fetchMarketingReport();
    fetchFinancialReport();
    fetchAnalyticsReport();
  }, []);

  // ------------------------------
  // Tab Content Renderer
  // ------------------------------
  const renderTabContent = () => {
    switch (activeTab) {
      case "sales":
        return (
          <div className="report-tab">
            <h3>📊 Sales Report</h3>
            <p>Total Revenue: ৳{salesData.totalRevenue || 0}</p>
            <p>Orders Count: {salesData.ordersCount || 0}</p>
            <p>Average Order Value (AOV): ৳{salesData.averageOrderValue || 0}</p>

            <h4>Daily Sales</h4>
            {salesData.dailySales ? (
              <Line
                data={{
                  labels: salesData.dailySales.map(d => d.date),
                  datasets: [
                    {
                      label: "Revenue",
                      data: salesData.dailySales.map(d => d.amount),
                      borderColor: "rgba(75,192,192,1)",
                      backgroundColor: "rgba(75,192,192,0.2)",
                    },
                  ],
                }}
              />
            ) : <p>Loading chart...</p>}

            <h4>Top Selling Products</h4>
            <ul>
              {(salesData.topProducts || []).map(p => (
                <li key={p.id}>{p.name} - {p.soldQuantity} sold</li>
              ))}
            </ul>
          </div>
        );

      case "customers":
        return (
          <div className="report-tab">
            <h3>👥 Customers Report</h3>
            <p>New Customers: {customersData.newCustomers || 0}</p>
            <p>Returning Customers: {customersData.returningCustomers || 0}</p>
            <h4>Top Customers</h4>
            <ul>
              {(customersData.topCustomers || []).map(c => (
                <li key={c.id}>{c.name} - ৳{c.totalSpent}</li>
              ))}
            </ul>
            <h4>Customer Locations</h4>
            <Pie
              data={{
                labels: customersData.locations?.map(l => l.area) || [],
                datasets: [{
                  label: "Customer Count",
                  data: customersData.locations?.map(l => l.count) || [],
                  backgroundColor: [
                    "#FF6384",
                    "#36A2EB",
                    "#FFCE56",
                    "#4BC0C0",
                    "#9966FF",
                  ],
                }],
              }}
            />
          </div>
        );

      case "products":
        return (
          <div className="report-tab">
            <h3>📦 Products / Inventory Report</h3>
            <p>Stock Alerts:</p>
            <ul>
              {(productsData.lowStock || []).map(p => (
                <li key={p.id}>{p.name} - {p.stock} left</li>
              ))}
            </ul>

            <h4>Category Wise Sales</h4>
            <Bar
              data={{
                labels: productsData.categorySales?.map(c => c.category) || [],
                datasets: [{
                  label: "Sales Amount",
                  data: productsData.categorySales?.map(c => c.amount) || [],
                  backgroundColor: "rgba(153,102,255,0.6)",
                }],
              }}
            />
          </div>
        );

      case "orders":
        return (
          <div className="report-tab">
            <h3>📝 Orders / Transactions Report</h3>
            <p>Pending Orders: {ordersData.pending || 0}</p>
            <p>Delivered Orders: {ordersData.delivered || 0}</p>
            <h4>Payment Methods</h4>
            <Pie
              data={{
                labels: ordersData.paymentMethods?.map(p => p.method) || [],
                datasets: [{
                  label: "Count",
                  data: ordersData.paymentMethods?.map(p => p.count) || [],
                  backgroundColor: ["#FF6384","#36A2EB","#FFCE56","#4BC0C0"],
                }],
              }}
            />
          </div>
        );

      case "marketing":
        return (
          <div className="report-tab">
            <h3>📣 Marketing / Ads Report</h3>
            <h4>Traffic Sources</h4>
            <Pie
              data={{
                labels: marketingData.sources?.map(s => s.source) || [],
                datasets: [{
                  label: "Visitors",
                  data: marketingData.sources?.map(s => s.count) || [],
                  backgroundColor: ["#FF6384","#36A2EB","#FFCE56","#4BC0C0","#9966FF"],
                }],
              }}
            />
            <p>Conversion Rate: {marketingData.conversionRate || 0}%</p>
          </div>
        );

      case "financial":
        return (
          <div className="report-tab">
            <h3>💰 Financial Report</h3>
            <p>Total Revenue: ৳{financialData.revenue || 0}</p>
            <p>Total Expenses: ৳{financialData.expense || 0}</p>
            <p>Net Profit: ৳{financialData.netProfit || 0}</p>
          </div>
        );

      case "analytics":
        return (
          <div className="report-tab">
            <h3>🌐 Website / Store Analytics</h3>
            <p>Visitors Count: {analyticsData.visitors || 0}</p>
            <p>Cart Abandon Rate: {analyticsData.cartAbandonRate || 0}%</p>
            <p>Checkout Conversion Rate: {analyticsData.checkoutConversionRate || 0}%</p>
          </div>
        );

      default:
        return <p>Select a report tab.</p>;
    }
  };

  return (
    <div className="reports-wrapper">
      <h2>📈 Admin Reports Dashboard</h2>
      <div className="report-tabs">
        <button onClick={() => setActiveTab("sales")} className={activeTab==="sales"?"active":""}>Sales</button>
        <button onClick={() => setActiveTab("customers")} className={activeTab==="customers"?"active":""}>Customers</button>
        <button onClick={() => setActiveTab("products")} className={activeTab==="products"?"active":""}>Products</button>
        <button onClick={() => setActiveTab("orders")} className={activeTab==="orders"?"active":""}>Orders</button>
        <button onClick={() => setActiveTab("marketing")} className={activeTab==="marketing"?"active":""}>Marketing</button>
        <button onClick={() => setActiveTab("financial")} className={activeTab==="financial"?"active":""}>Financial</button>
        <button onClick={() => setActiveTab("analytics")} className={activeTab==="analytics"?"active":""}>Analytics</button>
      </div>

      <div className="report-content">
        {renderTabContent()}
      </div>
    </div>
  );
}
