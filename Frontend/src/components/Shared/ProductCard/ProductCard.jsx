import React, {
    useEffect,
    useState,
    useCallback
} from "react";

import {
    Link,
    useSearchParams
} from "react-router-dom";

import {
    FaShoppingCart,
    FaWarehouse,
    FaHeart
} from "react-icons/fa";

import "./ProductCard.css";


// ======================================================
// API URL
// ======================================================

const PRODUCT_SHOW_API =
    "http://localhost/tajworld/Backend/backend/Product/ProductShow.php";


// ======================================================
// HELPERS
// ======================================================

const truncateText = (
    text,
    maxLength
) => {

    if (!text) {
        return "";
    }

    return text.length <= maxLength
        ? text
        : text.substring(0, maxLength) + "...";
};


const formatPrice = (price) => {

    const number =
        parseFloat(price) || 0;

    return `৳${number.toLocaleString()}`;
};


// ======================================================
// PRODUCT CARD
// ======================================================

export default function ProductCard() {


    // ==================================================
    // STATES
    // ==================================================

    const [products, setProducts] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [wishlistToast, setWishlistToast] =
        useState("");


    const [searchParams] =
        useSearchParams();


    const categorySlug =
        searchParams.get("category");


    // ==================================================
    // FETCH PRODUCTS
    // ==================================================

    const fetchProducts = useCallback(
        async () => {

            setLoading(true);


            try {

                // ------------------------------------------
                // API URL
                // ------------------------------------------

                let apiUrl =
                    PRODUCT_SHOW_API;


                if (categorySlug) {

                    apiUrl =
                        `${PRODUCT_SHOW_API}?category=${encodeURIComponent(
                            categorySlug
                        )}`;

                }


                console.log(
                    "Fetching Products:",
                    apiUrl
                );


                // ------------------------------------------
                // Fetch
                // ------------------------------------------

                const response =
                    await fetch(apiUrl);


                console.log(
                    "Product API Status:",
                    response.status
                );


                if (!response.ok) {

                    throw new Error(
                        `HTTP Error: ${response.status}`
                    );

                }


                // ------------------------------------------
                // JSON
                // ------------------------------------------

                const data =
                    await response.json();


                console.log(
                    "Product API Data:",
                    data
                );


                // ------------------------------------------
                // Set Products
                // ------------------------------------------

                if (Array.isArray(data)) {

                    setProducts(data);

                }

                else if (
                    data &&
                    Array.isArray(data.data)
                ) {

                    setProducts(data.data);

                }

                else {

                    console.error(
                        "Invalid product response:",
                        data
                    );

                    setProducts([]);

                }

            } catch (err) {

                console.error(
                    "Product Fetch Error:",
                    err
                );

                setProducts([]);

            } finally {

                setTimeout(
                    () => {
                        setLoading(false);
                    },
                    300
                );

            }

        },
        [categorySlug]
    );


    // ==================================================
    // LOAD PRODUCTS
    // ==================================================

    useEffect(() => {

        fetchProducts();

    }, [fetchProducts]);


    // ==================================================
    // ADD TO CART
    // ==================================================

    const handleAddToCart = (
        product,
        e
    ) => {

        e.preventDefault();

        e.stopPropagation();


        let cart =
            JSON.parse(
                localStorage.getItem("cart")
            ) || [];


        const size =
            product.size_options?.[0] ||
            "N/A";


        const existing =
            cart.find(
                (item) =>
                    item.id === product.id &&
                    item.selectedSize === size
            );


        if (!existing) {

            cart.push({

                ...product,

                quantity: 1,

                selectedSize: size

            });

        }

        else {

            existing.quantity += 1;

        }


        localStorage.setItem(
            "cart",
            JSON.stringify(cart)
        );


        window.dispatchEvent(
            new Event("cart-updated")
        );

    };


    // ==================================================
    // WISHLIST
    // ==================================================

    const handleWishlist = (
        product,
        e
    ) => {

        e.preventDefault();

        e.stopPropagation();


        let wishlist =
            JSON.parse(
                localStorage.getItem(
                    "wishlist"
                )
            ) || [];


        const exists =
            wishlist.find(
                (item) =>
                    item.id === product.id
            );


        if (exists) {

            wishlist =
                wishlist.filter(
                    (item) =>
                        item.id !== product.id
                );


            setWishlistToast(
                "Removed from wishlist 💔"
            );

        }

        else {

            wishlist.push(product);


            setWishlistToast(
                "Added to wishlist ❤️"
            );

        }


        localStorage.setItem(
            "wishlist",
            JSON.stringify(wishlist)
        );


        window.dispatchEvent(
            new Event("wishlist-updated")
        );


        setTimeout(
            () => {
                setWishlistToast("");
            },
            1800
        );

    };


    // ==================================================
    // CHECK WISHLIST
    // ==================================================

    const isWishlisted = (
        id
    ) => {

        const wishlist =
            JSON.parse(
                localStorage.getItem(
                    "wishlist"
                )
            ) || [];


        return wishlist.some(
            (item) =>
                item.id === id
        );

    };


    // ==================================================
    // LOADING
    // ==================================================

    if (loading) {

        return (
            <div className="loading-placeholder">
                Loading Products...
            </div>
        );

    }


    // ==================================================
    // NO PRODUCTS
    // ==================================================

    if (products.length === 0) {

        return (
            <div className="loading-placeholder">
                No products found.
            </div>
        );

    }


    // ==================================================
    // RENDER
    // ==================================================

    return (

        <>

            <div className="product-responsive-grid">

                {products.map(
                    (p) => {


                        // ==========================================
                        // PRICE
                        // ==========================================

                        const regularPrice =
                            parseFloat(
                                p.regular_price
                            ) || 0;


                        const discountPrice =
                            parseFloat(
                                p.discount_price
                            ) || 0;


                        const hasDiscount =
                            discountPrice > 0 &&
                            discountPrice < regularPrice;


                        const finalPrice =
                            hasDiscount
                                ? discountPrice
                                : regularPrice;


                        const discountPercent =
                            hasDiscount
                                ? Math.round(
                                    (
                                        (
                                            regularPrice -
                                            discountPrice
                                        ) /
                                        regularPrice
                                    ) * 100
                                )
                                : 0;


                        // ==========================================
                        // STOCK
                        // ==========================================

                        const stockCount =
                            parseInt(
                                p.stock
                            ) || 0;


                        // ==========================================
                        // IMAGE
                        // ==========================================

                        const imageUrl =
                            p.main_image ||
                            p.main_image_url ||
                            "/placeholder.png";


                        return (

                            <div
                                className="premium-card"
                                key={p.id}
                            >


                                {/* ======================================
                                    DISCOUNT
                                ====================================== */}

                                {discountPercent > 0 && (

                                    <div className="discount-strip">

                                        {discountPercent}
                                        % OFF

                                    </div>

                                )}


                                {/* ======================================
                                    WISHLIST
                                ====================================== */}

                                <div
                                    className={`wishlist-btn ${
                                        isWishlisted(p.id)
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={(e) =>
                                        handleWishlist(
                                            p,
                                            e
                                        )
                                    }
                                >

                                    <FaHeart />

                                </div>


                                {/* ======================================
                                    IMAGE
                                ====================================== */}

                                <div className="image-container">

                                    <Link
                                        to={`/product/${p.id}`}
                                    >

                                        <img
                                            src={imageUrl}
                                            alt={
                                                p.product_name ||
                                                "Product"
                                            }
                                            className="main-img"

                                            onError={(e) => {

                                                console.error(
                                                    "Image failed:",
                                                    imageUrl
                                                );


                                                // Prevent infinite loop
                                                if (
                                                    e.currentTarget
                                                        .dataset
                                                        .fallback !==
                                                    "true"
                                                ) {

                                                    e.currentTarget.dataset.fallback =
                                                        "true";


                                                    e.currentTarget.src =
                                                        "/placeholder.png";

                                                }

                                            }}
                                        />

                                    </Link>

                                </div>


                                {/* ======================================
                                    PRODUCT INFO
                                ====================================== */}

                                <div className="info-container">


                                    {/* STOCK */}

                                    <div className="stock-tag">

                                        <FaWarehouse />

                                        {" "}

                                        {stockCount}
                                        {" "}
                                        IN STOCK

                                    </div>


                                    {/* PRODUCT NAME */}

                                    <Link
                                        to={`/product/${p.id}`}
                                        className="name-link"
                                    >

                                        <h4 className="p-name">

                                            {truncateText(
                                                p.product_name,
                                                25
                                            )}

                                        </h4>

                                    </Link>


                                    {/* ==================================
                                        FOOTER
                                    ================================== */}

                                    <div className="footer-row">


                                        {/* PRICE */}

                                        <div className="price-box">

                                            <span className="current-p">

                                                {formatPrice(
                                                    finalPrice
                                                )}

                                            </span>


                                            {hasDiscount && (

                                                <span className="old-p">

                                                    {formatPrice(
                                                        regularPrice
                                                    )}

                                                </span>

                                            )}

                                        </div>


                                        {/* CART */}

                                        <button
                                            className="cart-mini-btn"
                                            onClick={(e) =>
                                                handleAddToCart(
                                                    p,
                                                    e
                                                )
                                            }
                                            disabled={
                                                stockCount <= 0
                                            }
                                            title={
                                                stockCount <= 0
                                                    ? "Out of stock"
                                                    : "Add to cart"
                                            }
                                        >

                                            <FaShoppingCart />

                                        </button>

                                    </div>

                                </div>

                            </div>

                        );

                    }
                )}

            </div>


            {/* ==========================================
                WISHLIST TOAST
            ========================================== */}

            {wishlistToast && (

                <div className="wishlist-toast">

                    {wishlistToast}

                </div>

            )}

        </>

    );

}