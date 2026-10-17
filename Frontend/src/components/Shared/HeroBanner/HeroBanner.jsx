import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "./HeroBanner.css";

// স্লাইড ডেটা (ছবির URL গুলি আনস্প্ল্যাশ থেকে নেওয়া হয়েছে, যা রিয়েল স্লাইডশো তৈরি করবে)
const bannerSlides = [
  {
    title_line1: "Handmade with Heart,",
    title_line2: "Premium Products Crafted Just for You.",
    button_text: "SHOP NOW",
    link_to: "/shop",
    image_url:
      "https://images.unsplash.com/photo-1605022603803-8e95d6f250a3?q=80&w=2070&auto=format&fit=crop",
  },
  {
    title_line1: "Discover T MART World",
    title_line2: "Your Trusted Place for All Quality Creations.",
    button_text: "EXPLORE PRODUCTS",
    link_to: "/collections",
    image_url:
      "https://images.unsplash.com/photo-1585386959984-a4155224a1a1?q=80&w=2070&auto=format&fit=crop",
  },
  {
    title_line1: "Custom Designs",
    title_line2: "Unique Products Made the Way You Want!",
    button_text: "ORDER CUSTOM",
    link_to: "/custom-orders",
    image_url:
      "https://images.unsplash.com/photo-1609162142495-3b43cf8e08f4?q=80&w=2070&auto=format&fit=crop",
  },
  {
    title_line1: "All Category Products",
    title_line2: "Fashion • Accessories • Handmade Items & More",
    button_text: "SHOP COLLECTION",
    link_to: "/products",
    image_url:
      "https://images.unsplash.com/photo-1616587894289-9a5a7ab6c2f7?q=80&w=2070&auto=format&fit=crop",
  },
  {
    title_line1: "T MART",
    title_line2: "A Complete Store for Every Lifestyle Need.",
    button_text: "ABOUT US",
    link_to: "/about",
    image_url:
      "https://images.unsplash.com/photo-1621786030484-74e8a0c5c171?q=80&w=2070&auto=format&fit=crop",
  },
];

export default function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // 4 সেকেন্ড পর পর স্লাইড স্বয়ংক্রিয়ভাবে পরিবর্তন
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
    }, 4000); // 4 সেকেন্ডের বিরতি
    return () => clearInterval(slideInterval);
  }, []);

  // পরবর্তী স্লাইড ফাংশন
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
  };

  // পূর্ববর্তী স্লাইড ফাংশন
  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length
    );
  };

  const currentBanner = bannerSlides[currentSlide];

  return (
    <div className="hero-banner-container">
      {/* Navigation Arrows */}
      <button className="slide-arrow left-arrow" onClick={prevSlide} aria-label="Previous Slide">
        <FaChevronLeft />
      </button>

      <button className="slide-arrow right-arrow" onClick={nextSlide} aria-label="Next Slide">
        <FaChevronRight />
      </button>

      {/* Slide Content (key prop স্লাইড পরিবর্তনের সময় animation পুনরায় শুরু করতে সাহায্য করে) */}
      <div
        key={currentSlide}
        className="hero-banner-content fade-in"
        style={{ backgroundImage: `url(${currentBanner.image_url})` }}
      >
        <div className="overlay">
          <h2 className="banner-title">
            {currentBanner.title_line1}
            <br />
            <span className="highlight-text">{currentBanner.title_line2}</span>
          </h2>

          <Link to={currentBanner.link_to} className="shop-now-btn">
            {currentBanner.button_text}
          </Link>
        </div>
      </div>

      {/* Dot Indicators */}
      <div className="dot-indicators">
        {bannerSlides.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentSlide ? "active" : ""}`}
            onClick={() => setCurrentSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}