import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

const BASE_URL = "http://localhost/tajworld/Backend/backend";
const API_PRODUCT_DELETE = `${BASE_URL}/Product/ProductDelete.php`;

const ProductDelete = ({ productId: propProductId, productName = "this product", onDeleteSuccess }) => {
  const { productId: routeProductId } = useParams();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  // Props বা Route Parameters থেকে ID নেওয়া
  const activeProductId = propProductId || routeProductId;

  const handleDelete = async () => {
    if (!activeProductId) {
      alert("Product ID পাওয়া যায়নি!");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete product ID: "${activeProductId}"?`
    );

    if (!confirmed) {
      if (routeProductId) navigate("/admin/product-list");
      return;
    }

    try {
      setDeleting(true);

      const formData = new FormData();
      formData.append("product_id", String(activeProductId));

      const response = await axios.post(API_PRODUCT_DELETE, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 10000,
      });

      if (response.data?.success) {
        alert(response.data.message || "Product deleted successfully.");

        if (typeof onDeleteSuccess === "function") {
          onDeleteSuccess(activeProductId);
        }

        // রুট দিয়ে অ্যাক্সেস করা হলে প্রোডাক্ট লিস্ট পেজে ফেরত নেওয়া
        if (routeProductId) {
          navigate("/admin/product-list");
        }
      } else {
        alert(
          response.data?.message ||
          response.data?.error ||
          "Product delete failed."
        );
      }
    } catch (error) {
      console.error("Product delete error:", error);

      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Something went wrong while deleting the product.";

      alert(message);
    } finally {
      setDeleting(false);
    }
  };

  // যদি সরাসরি URL /admin/delete-product/:productId দিয়ে পেজে আসা হয়
  useEffect(() => {
    if (routeProductId && !propProductId) {
      handleDelete();
    }
  }, [routeProductId]);

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        style={{
          padding: "10px 20px",
          backgroundColor: "#dc3545",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: deleting ? "not-allowed" : "pointer",
          opacity: deleting ? 0.6 : 1,
          fontWeight: "bold"
        }}
      >
        {deleting ? "Deleting..." : "Delete Product"}
      </button>
    </div>
  );
};

export default ProductDelete;