import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Cheakout.css";

const PROJECT_BASE_URL = "http://localhost/tajworld/Backend/backend";
const PLACE_ORDER_API = `${PROJECT_BASE_URL}/Orders/PlaceOrder.php`;

const getFullImagePath = (imagePath) => {
  if (!imagePath || imagePath === "undefined") {
    return "/placeholder.png";
  }

  const imageString = String(imagePath).replace(/\\/g, "/");

  if (/^https?:\/\//i.test(imageString)) {
    return imageString;
  }

  let cleanedPath = imageString
    .replace(/^\/+/, "")
    .replace(/^backend\/uploads\//i, "uploads/")
    .replace(/^backend\//i, "");

  if (!cleanedPath.toLowerCase().includes("uploads/")) {
    cleanedPath = `uploads/${cleanedPath}`;
  }

  return `${PROJECT_BASE_URL}/${cleanedPath}`;
};

const initialFormData = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postal_code: "",
  payment_method: "COD",
  payment_sender_number: "",
  payment_bank_name: "",
  payment_reference: "",
  payment_time: "",
  note: "",
};

export default function Checkout() {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [deliveryLocation, setDeliveryLocation] = useState("dhaka");
  const [addServiceCharge, setAddServiceCharge] = useState(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("cart");
      const parsedCart = savedCart ? JSON.parse(savedCart) : [];

      setCartItems(Array.isArray(parsedCart) ? parsedCart : []);
    } catch (error) {
      console.error("Cart loading error:", error);
      setCartItems([]);
    }
  }, []);

  const subtotal = cartItems.reduce((sum, item) => {
    const price = Number(
      item.discount_price ?? item.regular_price ?? item.price ?? 0
    );
    const quantity = Number(item.quantity ?? 0);

    if (
      !Number.isFinite(price) ||
      !Number.isFinite(quantity) ||
      price < 0 ||
      quantity <= 0
    ) {
      return sum;
    }

    return sum + price * quantity;
  }, 0);

  const deliveryCharge = deliveryLocation === "dhaka" ? 60 : 120;
  const serviceCharge = addServiceCharge ? 50 : 0;
  const total = subtotal + deliveryCharge + serviceCharge;

  const isCOD = formData.payment_method === "COD";
  const isBank = formData.payment_method === "Bank";

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handlePaymentMethodChange = (event) => {
    setFormData((previous) => ({
      ...previous,
      payment_method: event.target.value,
      payment_sender_number: "",
      payment_bank_name: "",
      payment_reference: "",
      payment_time: "",
    }));
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Returns an error message if payment details are incomplete, else ""
  const getPaymentError = () => {
    if (isCOD) return "";

    const sender = formData.payment_sender_number.trim();
    const bank = formData.payment_bank_name.trim();
    const reference = formData.payment_reference.trim();
    const time = formData.payment_time.trim();

    if (isBank && !bank) return "Please enter your bank name.";
    if (sender.length < 4 || sender.length > 50) {
      return isBank
        ? "Please enter a valid sender account number."
        : `Please enter your ${formData.payment_method} number.`;
    }
    if (reference.length < 3 || reference.length > 100) {
      return "Please enter a valid Transaction ID / Reference.";
    }
    if (time.length < 3 || time.length > 50) {
      return "Please enter the payment time (e.g. 15 Oct 2026, 3:45 PM).";
    }
    if (!(total > 0)) return "Order total is invalid.";

    return "";
  };

  const paymentError = getPaymentError();

  const renderPaymentInstructions = () => {
    const method = formData.payment_method;

    if (method === "COD") {
      return (
        <div className="payment-instructions">
          <strong>Cash on Delivery</strong>
          <p>Pay when your order is delivered. No payment details needed.</p>
        </div>
      );
    }

    const paymentName = isBank ? "Bank Transfer" : method;
    const merchantName = `YOUR_${method.toUpperCase()}_NUMBER`;

    return (
      <div className="payment-instructions">
        <strong>{paymentName}</strong>

        <p>
          Send exactly <strong>৳{total.toFixed(2)}</strong> to the merchant
          account below, then fill in your payment details.
        </p>

        {isBank ? (
          <>
            <p><strong>Bank:</strong> YOUR_BANK_NAME</p>
            <p><strong>Account Name:</strong> YOUR_ACCOUNT_NAME</p>
            <p><strong>Account Number:</strong> YOUR_ACCOUNT_NUMBER</p>
            <p><strong>Branch:</strong> YOUR_BRANCH</p>
          </>
        ) : (
          <p>
            <strong>Merchant {method}:</strong> {merchantName}
          </p>
        )}

        <hr />

        {isBank && (
          <input
            type="text"
            name="payment_bank_name"
            placeholder="Your Bank Name *"
            value={formData.payment_bank_name}
            onChange={handleChange}
            maxLength={100}
            autoComplete="off"
            required
          />
        )}

        <input
          type="tel"
          name="payment_sender_number"
          placeholder={
            isBank ? "Your Sender Account Number *" : `Your ${method} Number *`
          }
          value={formData.payment_sender_number}
          onChange={handleChange}
          maxLength={50}
          autoComplete="off"
          required
        />

        <input
          type="text"
          name="payment_reference"
          placeholder="Transaction ID / Reference *"
          value={formData.payment_reference}
          onChange={handleChange}
          maxLength={100}
          autoComplete="off"
          required
        />

        <input
          type="text"
          name="payment_time"
          placeholder="Payment Time * (e.g. 15 Oct 2026, 3:45 PM)"
          value={formData.payment_time}
          onChange={handleChange}
          maxLength={50}
          autoComplete="off"
          required
        />

        <label htmlFor="payment_amount">Amount to Pay (৳)</label>
        <input
          id="payment_amount"
          type="text"
          name="payment_amount"
          value={total.toFixed(2)}
          readOnly
          tabIndex={-1}
          style={{ background: "#f3f3f3", cursor: "not-allowed" }}
        />
      </div>
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const address = formData.address.trim();
    const city = formData.city.trim();
    const postalCode = formData.postal_code.trim();
    const note = formData.note.trim();

    const paymentSenderNumber = formData.payment_sender_number.trim();
    const paymentBankName = formData.payment_bank_name.trim();
    const paymentReference = formData.payment_reference.trim();
    const paymentTime = formData.payment_time.trim();
    const paymentMethod = formData.payment_method;

    if (!name || !email || !phone || !address || !city) {
      alert("Please fill in Name, Email, Phone, Address and City.");
      return;
    }

    if (name.length < 2 || name.length > 100) {
      alert("Please enter a valid name.");
      return;
    }

    if (
      [name, email, phone, address, city, postalCode, note].some((value) =>
        /[\x00-\x1F\x7F]/.test(value)
      )
    ) {
      alert("Invalid characters detected in your information.");
      return;
    }

    if (email.length > 190 || !isValidEmail(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    if (!/^[0-9+\-\s().]{7,30}$/.test(phone)) {
      alert("Please enter a valid phone number.");
      return;
    }

    if (address.length < 5 || address.length > 500) {
      alert("Please enter a valid address.");
      return;
    }

    if (city.length > 100 || postalCode.length > 30 || note.length > 1000) {
      alert("Please check the city, postal code and order note lengths.");
      return;
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    if (cartItems.length > 100) {
      alert("Too many products in cart.");
      return;
    }

    if (!["COD", "bKash", "Nagad", "Bank"].includes(paymentMethod)) {
      alert("Invalid payment method.");
      return;
    }

    // bKash / Nagad / Bank => all payment info is mandatory
    if (paymentMethod !== "COD") {
      const err = getPaymentError();
      if (err) {
        alert(err);
        return;
      }

      if (
        /[\x00-\x1F\x7F]/.test(
          paymentSenderNumber + paymentBankName + paymentReference + paymentTime
        )
      ) {
        alert("Invalid characters detected in payment information.");
        return;
      }
    }

    const secureCart = cartItems.map((item) => ({
      id: Number(item.id ?? item.product_id),
      quantity: Number(item.quantity),
      selectedSize: String(item.selectedSize ?? item.selected_size ?? ""),
    }));

    const invalidCartItem = secureCart.some(
      (item) =>
        !Number.isInteger(item.id) ||
        item.id <= 0 ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > 100
    );

    if (invalidCartItem) {
      alert(
        "Your cart contains an invalid item. Refresh your cart and try again."
      );
      return;
    }

    const orderData = {
      customer: {
        name,
        email,
        phone,
        address,
        city,
        postal_code: postalCode,
        delivery_type:
          deliveryLocation === "dhaka" ? "Dhaka" : "Outside Dhaka",
        payment_method: paymentMethod,
        payment_sender_number:
          paymentMethod === "COD" ? "" : paymentSenderNumber,
        payment_bank_name: paymentMethod === "Bank" ? paymentBankName : "",
        payment_reference: paymentMethod === "COD" ? "" : paymentReference,
        payment_time: paymentMethod === "COD" ? "" : paymentTime,
        // Amount is always the order total (server recalculates anyway)
        payment_amount: paymentMethod === "COD" ? 0 : Number(total.toFixed(2)),
        note,
      },
      items: secureCart,
      service_charge_requested: addServiceCharge,
    };

    setLoading(true);

    try {
      const response = await fetch(PLACE_ORDER_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // needed so the customer-token cookie is saved (order history works)
        credentials: "include",
        body: JSON.stringify(orderData),
      });

      const rawText = await response.text();
      let data;

      try {
        data = JSON.parse(rawText);
      } catch {
        console.error("PlaceOrder returned non-JSON:", rawText);
        throw new Error(
          "The server returned an invalid response. Check the PHP error log."
        );
      }

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Order request failed (HTTP ${response.status}).`
        );
      }

      if (!data.order_id) {
        throw new Error("The server did not return an order ID.");
      }

      sessionStorage.setItem("lastOrderId", String(data.order_id));

      localStorage.removeItem("cart");
      setCartItems([]);
      window.dispatchEvent(new Event("order-placed"));
      window.dispatchEvent(new Event("cart-updated"));

      alert(`Order placed successfully!\n\nOrder ID: ${data.order_id}`);
      navigate("/order-history");
    } catch (error) {
      console.error("Order Error:", error);
      alert(
        `Unable to place order.\n\n${error?.message || "Please try again."}`
      );
    } finally {
      setLoading(false);
    }
  };

  const submitDisabled =
    loading || cartItems.length === 0 || (!isCOD && paymentError !== "");

  return (
    <div className="checkout-page">
      <h2>🛒 Checkout</h2>

      <div className="checkout-container">
        <form onSubmit={handleSubmit} className="checkout-form" noValidate>
          <input
            type="text"
            name="name"
            placeholder="Full Name *"
            value={formData.name}
            onChange={handleChange}
            maxLength={100}
            autoComplete="name"
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email *"
            value={formData.email}
            onChange={handleChange}
            maxLength={190}
            autoComplete="email"
            required
          />

          <input
            type="tel"
            name="phone"
            placeholder="Phone Number *"
            value={formData.phone}
            onChange={handleChange}
            maxLength={30}
            autoComplete="tel"
            required
          />

          <input
            type="text"
            name="address"
            placeholder="Address *"
            value={formData.address}
            onChange={handleChange}
            maxLength={500}
            autoComplete="street-address"
            required
          />

          <input
            type="text"
            name="city"
            placeholder="City *"
            value={formData.city}
            onChange={handleChange}
            maxLength={100}
            autoComplete="address-level2"
            required
          />

          <input
            type="text"
            name="postal_code"
            placeholder="Postal Code"
            value={formData.postal_code}
            onChange={handleChange}
            maxLength={30}
            autoComplete="postal-code"
          />

          <div className="delivery-options">
            <label>
              <input
                type="radio"
                name="delivery_location"
                value="dhaka"
                checked={deliveryLocation === "dhaka"}
                onChange={(event) => setDeliveryLocation(event.target.value)}
              />
              Inside Dhaka (৳60)
            </label>

            <label>
              <input
                type="radio"
                name="delivery_location"
                value="outside"
                checked={deliveryLocation === "outside"}
                onChange={(event) => setDeliveryLocation(event.target.value)}
              />
              Outside Dhaka (৳120)
            </label>
          </div>

          <label className="service-charge">
            <input
              type="checkbox"
              checked={addServiceCharge}
              onChange={(event) => setAddServiceCharge(event.target.checked)}
            />
            Add optional service charge (৳50)
          </label>

          <label htmlFor="payment_method">Payment Method</label>

          <select
            id="payment_method"
            name="payment_method"
            value={formData.payment_method}
            onChange={handlePaymentMethodChange}
          >
            <option value="COD">Cash on Delivery</option>
            <option value="bKash">bKash</option>
            <option value="Nagad">Nagad</option>
            <option value="Bank">Bank Transfer</option>
          </select>

          {renderPaymentInstructions()}

          <textarea
            name="note"
            placeholder="Order Note (Optional)"
            value={formData.note}
            onChange={handleChange}
            maxLength={1000}
          />

          {!isCOD && paymentError && (
            <small style={{ color: "#c0392b" }}>⚠ {paymentError}</small>
          )}

          <button type="submit" disabled={submitDisabled}>
            {loading ? "Placing Order..." : "Place Order"}
          </button>
        </form>

        <div className="order-summary">
          <h3>🧾 Order Summary</h3>

          {cartItems.map((item, index) => {
            const price =
              Number(
                item.discount_price ?? item.regular_price ?? item.price ?? 0
              ) || 0;

            const quantity = Number(item.quantity) || 0;
            const lineTotal = price * quantity;
            const itemKey = item.id ?? item.product_id ?? index;
            const itemName = item.product_name ?? item.name ?? "Product";
            const imagePath = item.main_image ?? item.image ?? "";

            return (
              <div className="order-item" key={`${itemKey}-${index}`}>
                <img
                  src={getFullImagePath(imagePath)}
                  alt={itemName}
                  className="order-item-image"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = "/placeholder.png";
                  }}
                />

                <div className="item-details-text">
                  <span>
                    {itemName}
                    {(item.selectedSize ?? item.selected_size) ? (
                      <small>
                        {" "}({item.selectedSize ?? item.selected_size})
                      </small>
                    ) : null}
                  </span>

                  <span className="item-quantity">× {quantity}</span>
                </div>

                <span className="item-total">৳{lineTotal.toFixed(2)}</span>
              </div>
            );
          })}

          <hr />

          <p>Subtotal: ৳{subtotal.toFixed(2)}</p>
          <p>Delivery Charge: ৳{deliveryCharge.toFixed(2)}</p>
          <p>Service Charge: ৳{serviceCharge.toFixed(2)}</p>

          <h4>Total Price: ৳{total.toFixed(2)}</h4>

          <small>
            The final amount is recalculated and verified by the server.
          </small>
        </div>
      </div>
    </div>
  );
}