import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

// 💡 Admin Dashboard এর জন্য প্রয়োজনীয় কম্পোনেন্টগুলো ইম্পোর্ট করা হলো
import CategoryManagement from "../CategoryManagement/CategoryManagement";
import OrderList from "../Orders/OrderList";
import Users from "../Users/Users";
import Settings from "../Settings/Settings";
import Reports from "../Reports/Reports";

// 🆕 প্রোডাক্ট ম্যানেজমেন্ট কম্পোনেন্ট ইম্পোর্ট করা হলো
import AddProduct from "../Product/AddProduct/AddProduct"; 
import ProductUpdate from "../Product/ProductUpdate/ProductUpdate";
import ProductList from "../Product/ProductList/ProductList";

// 🆕 E-commerce Accounts (হিসাবের সিস্টেম)
import DailyMonthlyReport from "../E-commerce Accounts/Daily & Monthly Report/Daily & Monthly Report";
import PurchasesStock from "../E-commerce Accounts/Purchases & Stock/Purchases & Stock";
import ExpensesCashbook from "../E-commerce Accounts/Expenses & Cashbook/Expenses & Cashbook";

// 🆕 নতুন ড্যাশবোর্ড ওভারভিউ (সেলস, গ্রাফ, ফাইন্যান্স, স্টক, রিসেন্ট অর্ডার)
import DashboardOverview from "./DashboardOverview";

// AdminHeader থেকে আনা আইকন
import {
    FaShoppingBag, FaBoxOpen, FaUsers, FaCog, FaChartBar,
    FaLayerGroup, FaTachometerAlt, FaBars, FaTimes, FaAngleRight, FaRegUser,
    FaBell, FaAngleDown, FaPlusSquare,
    FaCalculator, FaChartLine, FaWarehouse, FaMoneyBillWave
} from "react-icons/fa";
import { BiMenu } from "react-icons/bi";
import "./AdminDashboard.css"; 

const BASE_URL = "http://localhost/tajworld/Backend/backend";
const API_STATS = `${BASE_URL}/Admin/Dashboard/get_dashboard_stats.php`;
const API_CATEGORIES_COUNT = `${BASE_URL}/Admin/manage_categories/CategoryFetch.php`;

export default function AdminDashboard() {
    const navigate = useNavigate();
    const location = useLocation();

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [stats, setStats] = useState({
        totalOrders: 0,
        todayOrders: 0,
        totalProducts: 0,
    });
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);
    const [isAccountsMenuOpen, setIsAccountsMenuOpen] = useState(false);
    const [currentView, setCurrentView] = useState(() => {
        const path = location.pathname;
        if (path.includes('/admin-orders')) return 'orders';
        if (path.includes('/admin/manage-categories')) return 'categories';
        if (path.includes('/admin/product-list')) return 'product-list'; 
        if (path.includes('/admin/add-product')) return 'add-product'; 
        if (path.includes('/admin/edit-product')) return 'edit-product'; 
        if (path.includes('/admin-users')) return 'users';
        if (path.includes('/admin-settings')) return 'settings';
        if (path.includes('/admin-reports')) return 'reports';
        return 'dashboard';
    });

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
    const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);
    const toggleProductMenu = () => setIsProductMenuOpen(prev => !prev);
    const toggleAccountsMenu = () => setIsAccountsMenuOpen(prev => !prev);

    useEffect(() => {
        const adminMainContent = document.querySelector('.admin-content-wrapper');
        const adminTopBar = document.querySelector('.admin-topbar');
        if (adminMainContent && adminTopBar) {
            if (isSidebarOpen) {
                adminMainContent.classList.remove('sidebar-closed');
                adminTopBar.classList.remove('full-width');
            } else {
                adminMainContent.classList.add('sidebar-closed');
                adminTopBar.classList.add('full-width');
            }
        }
    }, [isSidebarOpen]);

    useEffect(() => {
        const path = location.pathname;
        let viewName = 'dashboard';
        if (path.includes('/admin-orders')) viewName = 'orders';
        else if (path.includes('/admin/manage-categories')) viewName = 'categories';
        else if (path.includes('/admin/product-list')) viewName = 'product-list';
        else if (path.includes('/admin/add-product')) viewName = 'add-product';
        else if (path.includes('/admin/edit-product')) viewName = 'edit-product';
        else if (path.includes('/admin-users')) viewName = 'users';
        else if (path.includes('/admin-settings')) viewName = 'settings';
        else if (path.includes('/admin-reports')) viewName = 'reports';
        else if (path === '/admin-dashboard' || path === '/admin') viewName = 'dashboard';

        setCurrentView(viewName);
        setIsAccountsMenuOpen(false);
        if (['product-list', 'add-product', 'edit-product'].includes(viewName)) setIsProductMenuOpen(true);
        else if (viewName !== 'categories') setIsProductMenuOpen(false);

    }, [location.pathname]);

    const handleNavigation = (viewName, path = '', categoryId = "") => {
        setCurrentView(viewName);
        setSelectedCategory(categoryId);
        if (viewName.startsWith('acc-')) {
            setIsAccountsMenuOpen(true);
            setIsProductMenuOpen(false);
        }
        if (path) navigate(path);
        if (window.innerWidth < 992) setIsMobileMenuOpen(false);
    };

    const isActive = (viewName) => currentView.startsWith(viewName) ? 'active' : '';

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await axios.get(API_STATS);
            if(res.data.success) {
                setStats(prev => ({ 
                    ...prev, 
                    totalOrders: res.data.totalOrders || 0,
                    todayOrders: res.data.todayOrders || 0,
                    totalProducts: res.data.totalProducts || 0,
                }));
            }
        } catch (err) {
            console.error("Error fetching stats:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategoriesForDashboard = useCallback(async () => {
        try {
            const res = await axios.get(API_CATEGORIES_COUNT);
            if(res.data.success) setCategories(res.data.data || []);
        } catch (err) {
            console.error("Error fetching categories:", err);
        }
    }, []);

    const handleProductCountUpdate = useCallback((count) => {
        setStats(prev => ({ ...prev, totalProducts: count }));
    }, []);

    const handleCategoryClickForProductView = (categoryId) => {
        handleNavigation('product-list', `/admin/product-list?category=${categoryId}`, categoryId);
    };

    useEffect(() => {
        fetchStats();
        fetchCategoriesForDashboard();
    }, [fetchCategoriesForDashboard]);

    const renderContent = () => {
        if (loading && currentView === 'dashboard') {
            return <div className="loading-spinner">Loading Dashboard Data...</div>;
        }

        const pathSegments = location.pathname.split('/');
        const dynamicId = pathSegments[pathSegments.length - 1]; 
        const isEditRoute = location.pathname.includes('/admin/edit-product/');
        const productId = (isEditRoute && /^\d+$/.test(dynamicId)) ? dynamicId : null; 

        switch (currentView) {
            case 'orders':
                return <div className="admin-page-container"><OrderList /></div>;
            case 'acc-report':
                return <div className="admin-page-container"><DailyMonthlyReport /></div>;
            case 'acc-purchases':
                return <div className="admin-page-container"><PurchasesStock /></div>;
            case 'acc-expenses':
                return <div className="admin-page-container"><ExpensesCashbook /></div>;
            case 'categories':
                return <div className="admin-page-container">
                    <h2 className="admin-page-header">🗂️ Category Management</h2>
                    <CategoryManagement
                        onUpdate={fetchCategoriesForDashboard}
                        onCategorySelect={handleCategoryClickForProductView}
                    />
                </div>;
            case 'add-product':
                return <div className="admin-page-container">
                    <h2 className="admin-page-header">➕ Add New Product</h2>
                    <AddProduct />
                </div>;
            case 'edit-product':
                return <div className="admin-page-container">
                    <h2 className="admin-page-header">✏️ Edit Product</h2>
                    <ProductUpdate key={productId || 'new'} productId={productId} /> 
                </div>;
            case 'users': 
                return <div className="admin-page-container"><Users /></div>;
            case 'settings': 
                return <div className="admin-page-container"><Settings /></div>;
            case 'reports': 
                return <div className="admin-page-container"><Reports /></div>;
            case 'product-list':
                return <div className="admin-page-container">
                    <h2 className="dashboard-title">{selectedCategory ? 'Filtered Products List' : 'All Products List'}</h2>
                    <ProductList 
                        currentView={'product-list'} 
                        selectedCategory={selectedCategory}
                        onProductCountChange={handleProductCountUpdate} 
                    />
                </div>;
            case 'dashboard':
            default:
                return <div className="admin-page-container">
                    <h2 className="dashboard-title">Dashboard</h2>

                    <DashboardOverview stats={stats} onNavigate={handleNavigation} />

                    <div style={{ marginTop: '30px' }}>
                        <ProductList 
                            currentView={'dashboard'} 
                            selectedCategory={""}
                            onProductCountChange={handleProductCountUpdate} 
                        />
                    </div>
                    <div className="data-sections-grid" style={{ gridTemplateColumns: '1fr' }}>
                        <div className="data-panel category-list-panel"> 
                            <h3>Categories (Count)</h3> 
                            <ul>
                                {categories.slice(0, 5).map(cat => (
                                    <li key={cat.id} onClick={() => handleCategoryClickForProductView(cat.id)}>
                                        {cat.category_name} ({cat.product_count || 0})
                                    </li>
                                ))}
                                {categories.length > 5 && 
                                    <li><a onClick={() => handleNavigation("categories", "/admin/manage-categories")}>View All...</a></li>
                                }
                            </ul>
                        </div>
                    </div>
                </div>;
        }
    };

    return (
        <div className="admin-layout-wrapper">
            <header className={`admin-topbar ${!isSidebarOpen ? 'full-width' : ''}`}>
                <div className="topbar-left">
                    <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
                        {isSidebarOpen ? <FaTimes /> : <FaBars />}
                    </button>
                    <div className="mobile-menu-icon" onClick={toggleMobileMenu}><BiMenu /></div>
                    <h1 className="admin-logo">Admin Panel</h1>
                </div>
                <div className="topbar-right">
                    <div className="admin-notifications">
                        <FaBell /> <span className="badge">{stats.todayOrders}</span>
                    </div>
                    <div className="admin-profile"><FaRegUser /> Hi, Admin</div> 
                    <button className="logout-btn" onClick={() => navigate('/admin-logout')}>Logout</button>
                </div>
            </header>

            <nav className={`admin-sidebar ${isSidebarOpen ? 'open' : 'closed'} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-links">
                    <ul>
                        <li className={isActive('dashboard')} onClick={() => handleNavigation("dashboard", "/admin-dashboard")}><FaTachometerAlt /> <span>Dashboard</span> <FaAngleRight className="menu-arrow" /></li>
                        <li className={isActive('orders')} onClick={() => handleNavigation("orders", "/admin-orders")}><FaShoppingBag /> <span>Orders</span> <FaAngleRight className="menu-arrow" /></li>

                        <li className={`has-submenu ${isAccountsMenuOpen ? 'open' : ''}`}>
                            <div className="menu-header" onClick={toggleAccountsMenu}>
                                <FaCalculator /> <span>E-commerce Accounts</span>
                                <FaAngleDown className={`submenu-arrow ${isAccountsMenuOpen ? 'rotate' : ''}`} />
                            </div>
                            <ul className="submenu-list">
                                <li className={isActive('acc-report')} onClick={() => handleNavigation("acc-report")}>
                                    <FaChartLine /> <span>Daily & Monthly Report</span>
                                </li>
                                <li className={isActive('acc-purchases')} onClick={() => handleNavigation("acc-purchases")}>
                                    <FaWarehouse /> <span>Purchases & Stock</span>
                                </li>
                                <li className={isActive('acc-expenses')} onClick={() => handleNavigation("acc-expenses")}>
                                    <FaMoneyBillWave /> <span>Expenses & Cashbook</span>
                                </li>
                            </ul>
                        </li>

                        <li className={`has-submenu ${isProductMenuOpen ? 'open' : ''}`}>
                            <div className="menu-header" onClick={toggleProductMenu}>
                                <FaBoxOpen /> <span>Manage Products</span> 
                                <FaAngleDown className={`submenu-arrow ${isProductMenuOpen ? 'rotate' : ''}`} />
                            </div>
                            <ul className="submenu-list">
                                <li className={isActive('product-list') || isActive('edit-product') ? 'active' : ''} onClick={() => handleNavigation("product-list", "/admin/product-list")}>
                                    <FaAngleRight /> <span>Product List</span>
                                </li>
                                <li className={isActive('add-product')} onClick={() => handleNavigation("add-product", "/admin/add-product")}>
                                    <FaPlusSquare /> <span>Add Product</span>
                                </li>
                            </ul>
                        </li>
                        <li className={isActive('categories')} onClick={() => handleNavigation("categories", "/admin/manage-categories")}><FaLayerGroup /> <span>Categories</span> <FaAngleRight className="menu-arrow" /></li>
                        <li className={isActive('users')} onClick={() => handleNavigation('users', "/admin-users")}><FaUsers /> <span>Users</span> <FaAngleRight className="menu-arrow" /></li>
                        <li className={isActive('settings')} onClick={() => handleNavigation('settings', "/admin-settings")}><FaCog /> <span>Site Setting</span> <FaAngleRight className="menu-arrow" /></li>
                        <li className={isActive('reports')} onClick={() => handleNavigation('reports', "/admin-reports")}><FaChartBar /> <span>Reports</span> <FaAngleRight className="menu-arrow" /></li>
                    </ul>
                </div>
            </nav>

            <main className={`admin-content-wrapper ${!isSidebarOpen ? 'sidebar-closed' : ''}`}>
                {renderContent()}
            </main>

            {isMobileMenuOpen && <div className="sidebar-backdrop" onClick={toggleMobileMenu}></div>}
        </div>
    );
}