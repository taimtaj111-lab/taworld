import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaShoppingCart, FaTrash } from "react-icons/fa";
import "./WishlistCount.css";

const formatPrice = (price) => `৳${parseFloat(price).toLocaleString()}`;

export default function WishlistCount() {
  const [wishlist, setWishlist] = useState([]);

  // 🔄 Load wishlist from localStorage
  const loadWishlist = () => {
    const data = JSON.parse(localStorage.getItem("wishlist")) || [];
    setWishlist(data);
  };

  useEffect(() => {
    loadWishlist();
    window.addEventListener("wishlist-updated", loadWishlist);
    return () =>
      window.removeEventListener("wishlist-updated", loadWishlist);
  }, []);

  // ❌ Remove from wishlist
  const removeFromWishlist = (id) => {
    const updated = wishlist.filter((item) => item.id !== id);
    localStorage.setItem("wishlist", JSON.stringify(updated));
    setWishlist(updated);
    window.dispatchEvent(new Event("wishlist-updated"));
  };

  // 🛒 Add to cart
  const addToCart = (product) => {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const size = product.size_options?.[0] || "N/A";

    const exists = cart.find(
      (item) => item.id === product.id && item.selectedSize === size
    );

    if (!exists) {
      cart.push({ ...product, quantity: 1, selectedSize: size });
    } else {
      exists.quantity += 1;
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
  };

  if (wishlist.length === 0) {
    return (
      <div className="wishlist-empty">
        <h2>❤️ Wishlist is empty</h2>
        <Link to="/products">Go Shopping</Link>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <h2>❤️ My Wishlist</h2>

      <div className="wishlist-grid">
        {wishlist.map((p) => (
          <div className="wishlist-card" key={p.id}>
            <Link to={`/product/${p.id}`}>
              <img src={p.main_image} alt={p.product_name} />
            </Link>

            <div className="wishlist-info">
              <h4>{p.product_name}</h4>
              <p className="price">
                {formatPrice(p.discount_price || p.regular_price)}
              </p>

              <div className="wishlist-actions">
                <button
                  className="cart-btn"
                  onClick={() => addToCart(p)}
                >
                  <FaShoppingCart /> Add to Cart
                </button>

                <button
                  className="remove-btn"
                  onClick={() => removeFromWishlist(p.id)}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
