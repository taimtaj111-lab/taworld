import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom"; 
import {
    FaUser, FaHeart, FaShoppingCart, FaSearch,
    FaTimes, FaBars, FaAngleDown, FaSignOutAlt
} from "react-icons/fa";
import "./Header.css";

const CATEGORIES_API_URL = "http://localhost/tajworld/Backend/backend/Admin/manage_categories/get_categories.php";

export default function HeaderBasicFunc() {
    const navigate = useNavigate(); 
    const [isScrolled, setIsScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false); 
    const [shopDropdown, setShopDropdown] = useState(false); 
    
    const [cartCount, setCartCount] = useState(0);
    const [wishlistCount, setWishlistCount] = useState(0);
    const [categories, setCategories] = useState([]); 
    const [searchTerm, setSearchTerm] = useState(""); 

    const userDropdownRef = useRef(null); // Outside click detect korar jonno

    const isLoggedIn = JSON.parse(localStorage.getItem('isLoggedIn')) || false;
    const userName = localStorage.getItem('userName') || "Guest";

    const updateBadgeCounts = () => {
        const cart = JSON.parse(localStorage.getItem("cart")) || [];
        const wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];
        setCartCount(cart.length);
        setWishlistCount(wishlist.length);
    };

    useEffect(() => {
        updateBadgeCounts();

        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };

        // Click Outside Listener
        const handleClickOutside = (event) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
                setUserMenuOpen(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        window.addEventListener("cart-updated", updateBadgeCounts);
        window.addEventListener("wishlist-updated", updateBadgeCounts);
        window.addEventListener("storage", updateBadgeCounts);
        document.addEventListener("mousedown", handleClickOutside);

        fetch(CATEGORIES_API_URL)
            .then(res => res.json())
            .then(data => data.success && setCategories(data.categories))
            .catch(err => console.error(err));

        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("cart-updated", updateBadgeCounts);
            window.removeEventListener("wishlist-updated", updateBadgeCounts);
            window.removeEventListener("storage", updateBadgeCounts);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSearchSubmit = (e) => {
        e.preventDefault(); 
        if (searchTerm.trim()) {
            navigate(`/products?search=${searchTerm.trim()}`); 
            setSearchTerm("");
            setMenuOpen(false);
        }
    };

    return (
        <header className={`shopme-header ${isScrolled ? "scrolled" : ""}`}> 
            <div className="header-inner">
                <div className="header-left">
                    <Link to="/"><img src="/logo.png" alt="Logo" className="logo-img" /></Link>
                </div>

                <div className="header-center desktop-only">
                    <form className="modern-search" onSubmit={handleSearchSubmit}>
                        <input 
                            type="text" 
                            placeholder="Search products..." 
                            className="search-input" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button type="submit" className="search-btn"><FaSearch /></button>
                    </form>
                </div>

                <div className="header-right">
                    <nav className="desktop-nav">
                        <Link to="/">Home</Link>
                        <div className="dropdown" onMouseEnter={() => setShopDropdown(true)} onMouseLeave={() => setShopDropdown(false)}>
                            <span className="dropdown-toggle">Shop <FaAngleDown /></span>
                            <div className={`dropdown-menu ${shopDropdown ? "show" : ""}`}>
                                <Link to="/products">All Products</Link>
                                {categories.map(c => (
                                    <Link key={c.id} to={`/products?category=${c.slug}`}>{c.category_name}</Link>
                                ))}
                            </div>
                        </div>
                        <Link to="/offers">Offers</Link>
                    </nav>

                    <div className="icon-group">
                        <Link to="/wishlist" className="icon-box">
                            <FaHeart />
                            {wishlistCount > 0 && <span className="badge">{wishlistCount}</span>}
                        </Link>
                        <Link to="/addtocart" className="icon-box">
                            <FaShoppingCart />
                            {cartCount > 0 && <span className="badge">{cartCount}</span>}
                        </Link>
                        
                        {/* User Dropdown with Click Toggle */}
                        <div className="user-dropdown" ref={userDropdownRef}>
                            <button 
                                type="button" 
                                className="icon-btn-wrapper" 
                                onClick={() => setUserMenuOpen(prev => !prev)}
                            >
                                <FaUser className="icon-box" />
                            </button>

                            <div className={`dropdown-menu right-align ${userMenuOpen ? "show" : ""}`}>
                                {isLoggedIn ? (
                                    <>
                                        <span className="user-greet">Hi, {userName}</span>
                                        <Link to="/profile" onClick={() => setUserMenuOpen(false)}>Profile</Link>
                                        <span onClick={() => {localStorage.clear(); window.location.href="/"}} className="logout-btn">Logout</span>
                                    </>
                                ) : (
                                    <>
                                        <Link to="/user-login" onClick={() => setUserMenuOpen(false)}>User Login</Link>
                                        <Link to="/admin-login" onClick={() => setUserMenuOpen(false)}>Admin Login</Link>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="mobile-toggle" onClick={() => setMenuOpen(!menuOpen)}>
                            {menuOpen ? <FaTimes /> : <FaBars />}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mobile-search-wrapper mobile-only">
                <form className="modern-search" onSubmit={handleSearchSubmit}>
                    <input 
                        type="text" 
                        placeholder="What are you looking for?" 
                        className="search-input" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="search-btn"><FaSearch /></button>
                </form>
            </div>

            <div className={`mobile-nav-overlay ${menuOpen ? "open" : ""}`}>
                 <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
                 <Link to="/products" onClick={() => setMenuOpen(false)}>Shop</Link>
                 <Link to="/offers" onClick={() => setMenuOpen(false)}>Offers</Link>
                 <Link to="/about" onClick={() => setMenuOpen(false)}>About</Link>
                 <Link to="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
            </div>
        </header>
    );
}