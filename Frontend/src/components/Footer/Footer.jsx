import React from "react";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-section">
        <h3>Company Info</h3>
        <p>About Us</p>
        <p>Contact</p>
        <p>Address</p>
      </div>

      <div className="footer-section">
        <h3>Quick Links</h3>
        <p>Shop</p>
        <p>Categories</p>
        <p>Blog</p>
        <p>FAQs</p>
      </div>

      <div className="footer-section">
        <h3>Customer Support</h3>
        <p>Return Policy</p>
        <p>Shipping Info</p>
        <p>Privacy Policy</p>
        <p>Terms & Conditions</p>
      </div>

      <div className="footer-section">
        <h3>Follow Us</h3>
        <p>Facebook</p>
        <p>Instagram</p>
        <p>YouTube</p>
      </div>
    </footer>
  );
}
