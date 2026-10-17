
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaSpinner,
  FaStar,
  FaShoppingCart,
  FaBolt,
  FaTimes,
  FaArrowLeft,
  FaShareAlt,
  FaStore,
  FaShieldAlt,
  FaTruck,
  FaCheckCircle,
  FaChevronRight,
} from "react-icons/fa";
import ProductCard from "../Shared/ProductCard/ProductCard";
import "./ProductDetails.css";

const BASE_URL = "http://localhost/tajworld/Backend/backend/backend/";
const API_URL = `${BASE_URL}Product/ProductGet.php`;

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [mainImage, setMainImage] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(false);
  const [notice, setNotice] = useState("");

  const imgPath = useCallback((path) => {
    if (!path) return "/placeholder.png";

    if (/^https?:\/\//i.test(path)) return path;

    let cleanPath = String(path).replace(/\\/g, "/").replace(/^\/+/, "");

    if (cleanPath.startsWith("backend/")) {
      cleanPath = cleanPath.slice("backend/".length);
    }

    if (!cleanPath.includes("uploads/")) {
      cleanPath = `uploads/products/${cleanPath.split("/").pop()}`;
    }

    return `${BASE_URL}${cleanPath}`;
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchProduct() {
      setLoading(true);
      setProduct(null);
      setMainImage("");

      try {
        const response = await fetch(
          `${API_URL}?id=${encodeURIComponent(id)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const data = await response.json();
        const item = data.product || data;

        if (item && (item.product_name || item.id)) {
          const images = Array.isArray(item.images)
            ? item.images
            : [item.main_image, ...(item.other_images || [])].filter(Boolean);

          const normalizedImages = images.length
            ? images.map(imgPath)
            : ["/placeholder.png"];

          const sizes =
            item.size_options || item.size_options_array || [];

          setProduct({
            ...item,
            images: normalizedImages,
            stock: Number(item.stock) || 0,
            regular_price: Number(item.regular_price) || 0,
            discount_price: Number(item.discount_price) || 0,
          });

          setMainImage(normalizedImages[0]);
          setSelectedSize(sizes[0] || "");
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error fetching product:", error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    }

    fetchProduct();
    return () => controller.abort();
  }, [id, imgPath]);

  useEffect(() => {
    document.body.style.overflow = zoom ? "hidden" : "";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setZoom(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [zoom]);

  const sizesList = product
    ? product.size_options || product.size_options_array || []
    : [];

  const price =
    product && product.discount_price > 0 &&
    product.discount_price < product.regular_price
      ? product.discount_price
      : product?.regular_price || 0;

  const hasDiscount =
    product?.discount_price > 0 &&
    product.discount_price < product.regular_price;

  const discountPercent = hasDiscount
    ? Math.round(
        ((product.regular_price - product.discount_price) /
          product.regular_price) *
          100
      )
    : 0;

  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2500);
  };

  const addToCart = (silent = false) => {
    if (!product) return false;

    if (product.stock <= 0) {
      showNotice("Sorry, this product is out of stock.");
      return false;
    }

    if (sizesList.length > 0 && !selectedSize) {
      showNotice("Please select a size first.");
      return false;
    }

    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");

      const existing = cart.find(
        (item) =>
          String(item.id) === String(product.id) &&
          (item.selectedSize || "") === selectedSize
      );

      if (existing) {
        if (Number(existing.quantity || 0) >= product.stock) {
          showNotice("You have reached the available stock.");
          return false;
        }

        existing.quantity = Number(existing.quantity || 0) + 1;
        existing.current_price = price;
      } else {
        cart.push({
          id: product.id,
          product_name: product.product_name,
          current_price: price,
          main_image: mainImage,
          selectedSize,
          quantity: 1,
        });
      }

      localStorage.setItem("cart", JSON.stringify(cart));
      window.dispatchEvent(new Event("cart-updated"));

      if (!silent) {
        navigator.vibrate?.(30);
        showNotice("Product added to your cart!");
      }

      return true;
    } catch (error) {
      console.error("Unable to update cart:", error);
      showNotice("Unable to update cart. Please try again.");
      return false;
    }
  };

  const buyNow = () => {
    if (addToCart(true)) {
      navigate("/checkout");
    }
  };

  const shopNow = () => {
    navigate("/shop");
  };

  const shareProduct = async () => {
    const shareData = {
      title: product?.product_name || "TajWorld Product",
      text: `Check out ${product?.product_name || "this product"} on TajWorld.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        showNotice("Product link copied!");
      } else {
        showNotice("Sharing is not supported in this browser.");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Share failed:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="pd-loading-screen">
        <div className="pd-loader-ring">
          <FaSpinner className="spinner" />
        </div>
        <p>Preparing your TajWorld experience...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pd-empty-state">
        <FaStore />
        <h2>Product not found</h2>
        <p>This product may have been removed or is unavailable.</p>
        <button onClick={shopNow} className="pd-shop-button">
          <FaStore /> Shop Now
        </button>
      </div>
    );
  }

  return (
    <main className="modern-pd-wrapper">
      {/* TOP NAVIGATION */}
      <header className="pd-topbar">
        <button
          type="button"
          className="pd-back-button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <FaArrowLeft />
        </button>

        <button
          type="button"
          className="pd-brand"
          onClick={() => navigate("/")}
        >
          <span className="pd-brand-mark">T</span>
          <span>TajWorld</span>
        </button>

        <div className="pd-top-actions">
          <button
            type="button"
            className="pd-top-icon"
            onClick={shareProduct}
            aria-label="Share product"
          >
            <FaShareAlt />
          </button>

          <button
            type="button"
            className="pd-top-icon"
            onClick={() => navigate("/cart")}
            aria-label="View cart"
          >
            <FaShoppingCart />
          </button>
        </div>
      </header>

      {/* BREADCRUMB */}
      <div className="pd-breadcrumb">
        <button onClick={() => navigate("/")}>Home</button>
        <FaChevronRight />
        <button onClick={shopNow}>Shop</button>
        <FaChevronRight />
        <span>{product.product_name}</span>
      </div>

      {/* PRODUCT LAYOUT */}
      <section className="pd-layout-container">
        {/* PRODUCT GALLERY */}
        <div className="pd-visual-box">
          <div className="pd-gallery-heading">
            <span className="pd-gallery-label">PRODUCT COLLECTION</span>
            <button
              type="button"
              className="pd-share-desktop"
              onClick={shareProduct}
            >
              <FaShareAlt /> Share
            </button>
          </div>

          <div className="main-stage" onClick={() => setZoom(true)}>
            <img
              src={mainImage || "/placeholder.png"}
              alt={product.product_name}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/placeholder.png";
              }}
            />

            {hasDiscount && (
              <span className="premium-tag">
                {discountPercent}% OFF
              </span>
            )}

            <span className="pd-zoom-hint">Click image to zoom</span>
          </div>

          <div className="thumb-strip">
            {product.images.map((image, index) => (
              <button
                type="button"
                key={`${image}-${index}`}
                className={`thumb-card ${
                  mainImage === image ? "active" : ""
                }`}
                onClick={() => setMainImage(image)}
                aria-label={`View product image ${index + 1}`}
                aria-pressed={mainImage === image}
              >
                <img
                  src={image}
                  alt={`${product.product_name} ${index + 1}`}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = "/placeholder.png";
                  }}
                />
              </button>
            ))}
          </div>

          <div className="pd-trust-strip">
            <div>
              <FaShieldAlt />
              <span>Quality Products</span>
            </div>
            <div>
              <FaTruck />
              <span>Delivery Available</span>
            </div>
          </div>
        </div>

        {/* PRODUCT INFORMATION */}
        <div className="pd-detail-box">
          <div className="pd-overline">
            <span className="pd-live-dot" />
            TAJWORLD EXCLUSIVE
          </div>

          <h1 className="ultra-title">{product.product_name}</h1>

          <div className="pd-rating-row">
            <span className="pd-rating">
              <FaStar /> 4.9
            </span>
            <span className="pd-rating-divider" />
            <span className={product.stock > 0 ? "stock-in" : "stock-out"}>
              {product.stock > 0
                ? "In Stock"
                : "Currently Unavailable"}
            </span>
            {product.stock > 0 && (
              <span className="pd-stock-count">
                ({product.stock} available)
              </span>
            )}
          </div>

          <div className="pd-pricing">
            <span className="new-price">
              ৳{price.toLocaleString("en-BD")}
            </span>

            {hasDiscount && (
              <>
                <span className="old-price">
                  ৳{product.regular_price.toLocaleString("en-BD")}
                </span>
                <span className="pd-save-badge">
                  Save {discountPercent}%
                </span>
              </>
            )}
          </div>

          <div className="pd-price-caption">
            <FaCheckCircle />
            Great style, great value.
          </div>

          <div className="pd-divider" />

          {product.short_description && (
            <p className="modern-short-desc">
              {product.short_description}
            </p>
          )}

          {sizesList.length > 0 && (
            <div className="size-section">
              <div className="pd-option-heading">
                <label htmlFor="product-size">Choose your size</label>
                <span>{selectedSize ? `Selected: ${selectedSize}` : "Required"}</span>
              </div>

              <div className="size-grid">
                {sizesList.map((size) => (
                  <button
                    type="button"
                    key={size}
                    className={selectedSize === size ? "selected" : ""}
                    onClick={() => setSelectedSize(size)}
                    aria-pressed={selectedSize === size}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pd-action-stack">
            <button
              type="button"
              className="btn-primary"
              onClick={buyNow}
              disabled={product.stock <= 0}
            >
              <FaBolt />
              Buy Now
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => addToCart()}
              disabled={product.stock <= 0}
            >
              <FaShoppingCart />
              Add to Cart
            </button>

            <button
              type="button"
              className="pd-shop-now"
              onClick={shopNow}
            >
              <FaStore />
              Shop Now
              <FaChevronRight className="pd-shop-arrow" />
            </button>
          </div>

          <div className="pd-delivery-note">
            <FaTruck />
            <div>
              <strong>Ready to make it yours?</strong>
              <span>Explore more products from TajWorld.</span>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT DESCRIPTION */}
      <section className="full-details-area">
        <div className="pd-section-heading">
          <span>GET TO KNOW YOUR PRODUCT</span>
          <h2>Product Details</h2>
          <div />
        </div>

        <div className="description-content">
          {product.full_description ? (
            <div
              dangerouslySetInnerHTML={{
                __html: product.full_description,
              }}
            />
          ) : (
            <p>More details about this product will be available soon.</p>
          )}
        </div>
      </section>

      {/* RELATED PRODUCTS */}
      <section className="related-products-area">
        <div className="pd-section-heading">
          <span>MORE TO DISCOVER</span>
          <h2>You May Also Like</h2>
          <div />
        </div>

        <ProductCard />
      </section>

      {/* MOBILE PURCHASE BAR */}
      <div className="mobile-footer-actions">
        <button
          type="button"
          className="m-btn-cart"
          onClick={() => addToCart()}
          disabled={product.stock <= 0}
        >
          <FaShoppingCart />
          Add to Cart
        </button>

        <button
          type="button"
          className="m-btn-buy"
          onClick={buyNow}
          disabled={product.stock <= 0}
        >
          <FaBolt />
          Buy Now
        </button>
      </div>

      {/* IMAGE ZOOM */}
      {zoom && (
        <div
          className="fullscreen-zoom"
          onClick={() => setZoom(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Zoomed product image"
        >
          <button
            type="button"
            className="close-zoom"
            onClick={() => setZoom(false)}
            aria-label="Close zoom"
          >
            <FaTimes />
          </button>

          <img
            src={mainImage}
            alt={product.product_name}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      {/* FEEDBACK */}
      {notice && (
        <div className="pd-toast" role="status">
          <FaCheckCircle />
          {notice}
        </div>
      )}
    </main>
  );
}