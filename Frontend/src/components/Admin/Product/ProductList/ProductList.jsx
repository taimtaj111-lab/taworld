import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { FaEdit, FaEye, FaTrash } from "react-icons/fa";
import "./ProductList.css";

// ======================================================
// API BASE URL
// ======================================================
const BASE_URL = "http://localhost/tajworld/Backend/backend";

// Product Fetch & Delete API
const API_PRODUCT_FETCH = `${BASE_URL}/Product/ProductFetch.php`;
const API_PRODUCT_DELETE = `${BASE_URL}/Product/ProductDelete.php`;

// Image Base URL
const IMAGE_BASE_URL = "http://localhost/tajworld/Backend/backend/backend";

// ======================================================
// PRODUCT LIST COMPONENT
// ======================================================
export default function ProductList({
  currentView,
  selectedCategory,
  onProductCountChange,
}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [totalProductsCount, setTotalProductsCount] = useState(0);

  const navigate = useNavigate();

  // Dashboard = 5 products, Product List = 1000 products
  const limit = currentView === "dashboard" ? 5 : 1000;

  // ======================================================
  // FETCH PRODUCTS
  // ======================================================
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let url = `${API_PRODUCT_FETCH}?limit=${limit}`;

      if (
        selectedCategory !== undefined &&
        selectedCategory !== null &&
        selectedCategory !== ""
      ) {
        url += `&category_id=${selectedCategory}`;
      }

      const response = await axios.get(url, { timeout: 10000 });

      if (response.data && response.data.success === true) {
        const fetchedProducts = Array.isArray(response.data.data)
          ? response.data.data
          : [];

        const formattedProducts = fetchedProducts.map((product) => {
          const regularPrice = Number(product.regular_price || 0);
          const discountPrice =
            product.discount_price !== null &&
            product.discount_price !== undefined &&
            product.discount_price !== ""
              ? Number(product.discount_price)
              : null;

          let imagePath = "";
          if (product.main_image_url) {
            imagePath = product.main_image_url;
          } else if (product.main_image) {
            if (
              product.main_image.startsWith("http://") ||
              product.main_image.startsWith("https://")
            ) {
              imagePath = product.main_image;
            } else {
              imagePath = `${IMAGE_BASE_URL}/${product.main_image.replace(
                /^\/+/,
                ""
              )}`;
            }
          }

          return {
            ...product,
            regular_price: regularPrice,
            discount_price: discountPrice,
            stock: Number(product.stock || 0),
            image_path: imagePath,
          };
        });

        setProducts(formattedProducts);

        const count =
          response.data.total_count !== undefined
            ? Number(response.data.total_count)
            : Number(response.data.count || formattedProducts.length);

        setTotalProductsCount(count);

        if (typeof onProductCountChange === "function") {
          onProductCountChange(count);
        }
      } else {
        const message = response.data?.message || "Failed to fetch products.";
        setError(message);
        setProducts([]);
        setTotalProductsCount(0);
        if (typeof onProductCountChange === "function") {
          onProductCountChange(0);
        }
      }
    } catch (err) {
      console.error("Product Fetch Error:", err);
      setError("Failed to fetch products. Check network connection.");
      setProducts([]);
      setTotalProductsCount(0);
      if (typeof onProductCountChange === "function") {
        onProductCountChange(0);
      }
    } finally {
      setLoading(false);
    }
  }, [limit, selectedCategory, onProductCountChange]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ======================================================
  // EDIT PRODUCT
  // ======================================================
  const handleEditClick = (productId) => {
    navigate(`/admin/edit-product/${productId}`);
  };

  // ======================================================
  // INLINE DELETE PRODUCT (SECURE & DIRECT)
  // ======================================================
  const handleDeleteClick = async (productId, productName) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${productName || "this product"}"?`
    );

    if (!confirmDelete) return;

    try {
      setDeletingId(productId);

      const formData = new FormData();
      formData.append("product_id", String(productId));

      const response = await axios.post(API_PRODUCT_DELETE, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data?.success) {
        alert(response.data.message || "Product deleted successfully.");
        // স্টেট থেকে ফিল্টার করে রিলোড ছাড়া UI আপডেট
        setProducts((prev) => prev.filter((item) => item.id !== productId));
        setTotalProductsCount((prev) => prev - 1);
      } else {
        alert(response.data?.message || "Failed to delete product.");
      }
    } catch (err) {
      console.error("Delete product error:", err);
      alert(
        err.response?.data?.message ||
          "Error occurred while deleting the product."
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="product-list-loading">Loading Products...</div>;
  }

  if (error) {
    return (
      <div className="product-list-error">
        <p>{error}</p>
        <button type="button" onClick={fetchProducts}>
          Retry Fetch
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="product-list-empty">
        <p>
          No products found
          {selectedCategory ? ` for Category ID ${selectedCategory}.` : "."}
        </p>
        {currentView === "product-list" && (
          <button type="button" onClick={fetchProducts}>
            Refresh List
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`product-list-container ${currentView}`}>
      {currentView === "dashboard" && (
        <h3 className="recent-products-header">Recent Products</h3>
      )}

      <table className="product-list-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>IMAGE</th>
            <th>PRODUCT NAME</th>
            <th>CATEGORY</th>
            <th>CODE</th>
            <th>PRICE (Regular)</th>
            <th>STOCK</th>
            <th>ACTIONS</th>
          </tr>
        </thead>

        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.id}</td>

              <td className="product-image-cell">
                <img
                  src={product.image_path || "/placeholder.jpg"}
                  alt={product.product_name || "Product"}
                  className="product-thumb"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.jpg";
                  }}
                />
              </td>

              <td>{product.product_name || "N/A"}</td>
              <td>{product.category_name || "N/A"}</td>
              <td>{product.product_code || "N/A"}</td>
              <td>৳{Number(product.regular_price || 0).toFixed(2)}</td>
              <td>{product.stock ?? 0}</td>

              <td className="actions-cell">
                {/* EDIT */}
                <button
                  type="button"
                  className="action-btn edit-btn"
                  title="Edit Product"
                  onClick={() => handleEditClick(product.id)}
                >
                  <FaEdit />
                </button>

                {/* VIEW */}
                <Link
                  to={`/product/${product.slug || product.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button
                    type="button"
                    className="action-btn view-btn"
                    title="View Product"
                  >
                    <FaEye />
                  </button>
                </Link>

                {/* DELETE */}
                <button
                  type="button"
                  className="action-btn delete-btn"
                  title="Delete Product"
                  disabled={deletingId === product.id}
                  onClick={() =>
                    handleDeleteClick(product.id, product.product_name)
                  }
                  style={{
                    opacity: deletingId === product.id ? 0.5 : 1,
                    cursor: deletingId === product.id ? "not-allowed" : "pointer",
                  }}
                >
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {currentView === "dashboard" && products.length > 0 && (
        <div className="view-all-link-container">
          <Link to="/admin/product-list" className="view-all-link">
            View All Products ({totalProductsCount})
          </Link>
        </div>
      )}
    </div>
  );
}