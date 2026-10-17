import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaTag, FaStar, FaBoxes, FaSpinner, FaShoppingCart, FaHeart, FaEye } from "react-icons/fa";
import "./Offers.css";


const truncateText = (text, maxLength) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

const formatPrice = (price) => `৳${parseFloat(price).toFixed(2)}`;

export default function Offers() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOffers = async () => {
      setLoading(true);
      try {
        const res = await fetch("https://tutrait.wuaze.com/Product/ProductFetch.php");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();

        if (data.success && Array.isArray(data.data)) {
          // Filter only products with discount ≥ 15%
          const filtered = data.data.filter(p => {
            const regular = parseFloat(p.regular_price) || 0;
            const discount = parseFloat(p.discount_price) || 0;
            if (discount > 0 && regular > 0) {
              const percent = ((regular - discount) / regular) * 100;
              return percent >= 15;
            }
            return false;
          });
          setProducts(filtered);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error("Failed to fetch offers:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, []);

  const handleAddToCart = (product, e) => {
    e.stopPropagation();
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    let size = Array.isArray(product.size_options) && product.size_options.length > 0
      ? product.size_options[0]
      : 'N/A';
    const existing = cart.find((item) => item.id === product.id && item.selectedSize === size);
    const regularPrice = parseFloat(product.regular_price) || 0;
    const discountPrice = parseFloat(product.discount_price) || 0;
    const currentPrice = discountPrice > 0 && discountPrice < regularPrice ? discountPrice : regularPrice;

    if (!existing) {
      cart.push({
        id: product.id,
        product_name: product.product_name,
        current_price: currentPrice,
        regular_price: regularPrice,
        discount_price: discountPrice,
        main_image: product.main_image || "",
        quantity: 1,
        selectedSize: size
      });
      alert(`${product.product_name} added to cart! (Default Size: ${size})`);
    } else {
      existing.quantity += 1;
      alert(`${product.product_name} quantity updated in cart!`);
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
  };

  const handleAddToWishlist = (product, e) => {
    e.stopPropagation();
    alert(`${product.product_name} added to Wishlist! (Demo)`);
    window.dispatchEvent(new Event("wishlist-updated"));
  };

  const getDemoRating = (id) => {
    const lastDigit = Number(String(id).slice(-1)) || 0;
    if (lastDigit >= 8) return 5.0;
    if (lastDigit >= 6) return 4.5;
    if (lastDigit >= 4) return 4.0;
    if (lastDigit >= 2) return 3.5;
    return 3.0;
  };

  if (loading) {
    return (
      <div className="product-grid-container loading-state">
        <h2 style={{gridColumn: '1 / -1', textAlign: 'center'}}>
          <FaSpinner className="spinner" /> Loading Offers...
        </h2>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="product-grid-container no-products">
        <h2 style={{gridColumn: '1 / -1', textAlign: 'center'}}>
          No products with 15%+ discount found.
        </h2>
      </div>
    );
  }

  return (
    <div className="product-grid-container">
      {products.map((p) => {
        const regularPrice = parseFloat(p.regular_price) || 0;
        const discountPrice = parseFloat(p.discount_price) || 0;
        const finalPrice = discountPrice > 0 && discountPrice < regularPrice ? discountPrice : regularPrice;
        const hasDiscount = discountPrice > 0 && discountPrice < regularPrice;
        const discountPercent = hasDiscount ? Math.round(((regularPrice - discountPrice)/regularPrice)*100) : 0;
        const imageSrc = p.main_image || "/placeholder.png";
        const productLink = `/product/${p.id}`;
        const stockCount = parseInt(p.stock) || 0;

        return (
          <div className="product-card" key={p.id}>
            <Link to={productLink} className="product-link">
              <div className="product-image-wrapper">
                <img
                  src={imageSrc}
                  alt={p.product_name}
                  className="product-main-image"
                  loading="lazy"
                  onError={(e) => (e.target.src = "/placeholder.png")}
                />
                {discountPercent > 0 && (
                  <span className="discount-badge">
                    <FaTag /> -{discountPercent}%
                  </span>
                )}
                <div className="hover-actions">
                  <Link
                    to={productLink}
                    className="action-btn view-details-btn"
                    title="View Details"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FaEye />
                  </Link>
                  <button
                    className="action-btn wishlist-btn"
                    onClick={(e) => handleAddToWishlist(p, e)}
                    title="Add to Wishlist"
                  >
                    <FaHeart />
                  </button>
                </div>
              </div>
            </Link>
            <div className="product-info-container">
              <h4 className="product-name" title={p.product_name}>{truncateText(p.product_name, 35)}</h4>
              <div className="product-rating">
                <FaStar className="star-icon" />
                <span className="rating-value">{getDemoRating(p.id).toFixed(1)}</span>
              </div>
              <p className="product-price">
                {hasDiscount && (<span className="discount-price">{formatPrice(finalPrice)}</span>)}
                <span className={hasDiscount ? "regular-price discounted" : "regular-price"}>{formatPrice(regularPrice)}</span>
              </p>
              <p className="product-stock">
                <FaBoxes />
                {stockCount > 0 ? `In Stock: ${stockCount}` : (<span className="out-of-stock">Out of Stock</span>)}
              </p>
              <div className="grid-action-area">
                <button
                  className="add-to-cart-btn"
                  disabled={stockCount <= 0}
                  onClick={(e) => handleAddToCart(p, e)}
                >
                  <FaShoppingCart />
                  <span>{stockCount > 0 ? "Add to Cart" : "Out of Stock"}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
