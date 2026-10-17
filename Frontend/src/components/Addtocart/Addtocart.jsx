// C:\React Project\project2\src\components\Addtocart\Addtocart.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrashAlt, FaPlus, FaMinus, FaShoppingBag } from "react-icons/fa";
import "./Addtocart.css";
import OrderHistory from "./OrderHistory";

// ✅ ইমেজের জন্য ইউটিলিটি ফাংশন (শক্তিশালী পাথ ফিক্সিং সহ)
const PROJECT_BASE_URL = 'http://localhost/tajworld/Backend/backend'; 

const getFullImagePath = (imagePath) => {
    // 🛑 শক্তিশালী ফিক্স: null, undefined, বা "undefined" স্ট্রিং হ্যান্ডেল করা 🛑
    if (!imagePath || imagePath === "undefined") return "/placeholder.png"; 
    
    // 1. Full URL হলে সরাসরি রিটার্ন
    if (imagePath.startsWith("http")) {
        return imagePath.replace(/\\/g, "/"); 
    }
    
    // 2. Backslashes কে Forward Slashes এ পরিবর্তন করা 
    let cleanedPath = imagePath.replace(/\\/g, '/');
    
    // 3. ফিক্স: যদি ভুলবশত "backend/uploads/" পাথ চলে আসে (যা আপনার সমস্যা), তা সরিয়ে শুধু "uploads/" রাখা
    cleanedPath = cleanedPath.replace('backend/uploads/', 'uploads/');
    cleanedPath = cleanedPath.replace('backend/', '');
    
    // 4. যদি Path-এ "uploads/" না থাকে, তবে যোগ করা
    if (!cleanedPath.toLowerCase().includes('uploads/')) {
        cleanedPath = `uploads/${cleanedPath}`;
    }
    
    // 5. চূড়ান্ত URL তৈরি
    return `${PROJECT_BASE_URL}${cleanedPath}`; 
};
// -------------------------------------------


export default function AddToCart() {
  const [cart, setCart] = useState([]);
  const navigate = useNavigate();

  // ✅ লোকালস্টোরেজ আপডেট ফাংশন
  const updateLocalStorageAndNotify = (updatedCart) => {
    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    // Header-কে আপডেট করার জন্য ইভেন্ট ফায়ার
    window.dispatchEvent(new Event("cart-updated"));
  };

  // ✅ পেজ লোডে কার্ট লোড
  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(savedCart);
  }, []);

  // ✅ পরিমাণ বাড়ানো
  const increaseQuantity = (id) => {
    const updated = cart.map((item) =>
      item.id === id ? { ...item, quantity: (item.quantity || 0) + 1 } : item
    );
    updateLocalStorageAndNotify(updated);
  };

  // ✅ পরিমাণ কমানো
  const decreaseQuantity = (id) => {
    const updated = cart
      .map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(0, (item.quantity || 0) - 1) } 
          : item
      )
      .filter((item) => (item.quantity || 0) > 0); 
    updateLocalStorageAndNotify(updated);
  };

  // ✅ আইটেম রিমুভ (সম্পূর্ণ ডিলিট)
  const removeItem = (id) => {
    const updated = cart.filter((item) => item.id !== id);
    updateLocalStorageAndNotify(updated);
  };

  // ✅ মোট দাম গণনা
  const total = cart.reduce(
    (acc, item) => {
      // price এর জন্য fallback লজিক ব্যবহার করা হয়েছে
      const price = parseFloat(item.current_price || item.discount_price || item.regular_price) || 0;
      const quantity = parseInt(item.quantity) || 0;
      return acc + price * quantity;
    },
    0
  );

  // ✅ Checkout এ যাওয়া
  const handleCheckout = () => {
    if (cart.length === 0) return alert("🛒 Your cart is empty! Add products first.");
    navigate("/checkout");
  };

  return (
    <div className="cart-page-modern">
      <h2 className="page-title-modern">
        <FaShoppingBag /> Your Shopping Cart
      </h2>

      {cart.length === 0 ? (
        <div className="empty-cart-modern">
          <img
            src="https://cdn-icons-png.flaticon.com/512/11329/11329060.png"
            alt="Empty Cart"
          />
          <p>Your cart is empty. Start shopping now!</p>
        </div>
      ) : (
        <div className="cart-container-modern">
          <div className="cart-list-modern">
            {cart.map((item) => {
              const imageURL = getFullImagePath(item.main_image); 
              return (
                <div key={item.id} className="cart-card-modern">
                  <img
                    // ✅ ছবি দেখানোর লজিক
                    src={imageURL}
                    alt={item.product_name}
                    className="cart-img-modern"
                    onError={(e) => (e.target.src = "/placeholder.png")} 
                  />

                  <div className="cart-details-modern">
                    <h4>{item.product_name}</h4> 
                    {item.selectedSize && <p className="size-info">Size: {item.selectedSize}</p>} 
                        
                    <p className="price-modern">
                      ৳ {parseFloat(item.current_price || item.discount_price || item.regular_price).toFixed(2)}
                    </p>

                    <div className="qty-control-modern">
                      <button onClick={() => decreaseQuantity(item.id)}>
                        <FaMinus />
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => increaseQuantity(item.id)}>
                        <FaPlus />
                      </button>
                    </div>

                    <p className="subtotal-modern">
                      Subtotal:{" "}
                      <strong>
                        ৳{" "}
                        {(
                          (parseFloat(item.current_price || item.discount_price || item.regular_price) || 0) * (item.quantity || 0)
                        ).toFixed(2)}
                      </strong>
                    </p>

                    <button
                      className="remove-item-modern"
                      onClick={() => removeItem(item.id)}
                    >
                      <FaTrashAlt /> Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ✅ Order Summary */}
          <div className="cart-summary-modern">
            <h3>🧾 Order Summary (Cart Total)</h3>
            <p>Total Items: {cart.length}</p>
            <p>
              Subtotal: <strong>৳ {total.toFixed(2)}</strong>
            </p>
            <hr />
            <h4>
              Total (Excl. Delivery): <span>৳ {total.toFixed(2)}</span>
            </h4>

            <button className="checkout-btn-modern" onClick={handleCheckout}>
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}

      {/* ✅ Order History নিচে থাকবে */}
      <OrderHistory />
    </div>
  );
}