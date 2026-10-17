import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

// 🔹 User Components
import Header from "./components/Header/Header";
import WishlistCount from "./components/Header/Wishlist/WishlistCount";
import Offers from './components/Othercomponents/Offers/Offers';
import Contact from './components/Othercomponents/Contact/Contact';
import About from './components/Othercomponents/About/About';

import Footer from "./components/Footer/Footer";
import Home from "./components/Home/Home";
import ProductCard from "./components/Shared/ProductCard/ProductCard";
import ProductDetails from "./components/ProductDetails/ProductDetails";
import AddToCart from "./components/Addtocart/Addtocart"; 
import Cheakout from "./components/Checkout/Cheakout";

// 🔹 Admin Components
import AdminLoginPage from "./components/Forms/AdminLoginPage/AdminLoginPage";
import Register from "./components/Forms/AdminLoginPage/Register";
import Logout from "./components/Forms/AdminLoginPage/Logout";
import AdminDashboard from "./components/Admin/Dashboard/AdminDashboard";

// 🔒 Protected Route component
const ProtectedRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem("isAdmin") === "true";
    return isAuthenticated ? children : <Navigate to="/admin-login" replace />;
};

// 💡 Main App Content Component
function MainAppContent() {
    const location = useLocation(); 

    // Admin Layout বা Auth পেজে User Header/Footer হাইড করার লজিক
    const isAdminRoute = location.pathname.startsWith('/admin') || 
                         location.pathname.startsWith('/admin-dashboard') ||
                         location.pathname.startsWith('/admin-orders');
                         
    const isAuthPage = location.pathname === '/admin-login' || 
                       location.pathname === '/admin-register' || 
                       location.pathname === '/admin-logout';

    const shouldRenderLayout = !isAdminRoute && !isAuthPage;

    return (
        <>
            {/* User Layout Header */}
            {shouldRenderLayout && <Header />} 
            
            <Routes>
                {/* --- 🔹 User Pages --- */}
                <Route path="/" element={<Home />} />
                <Route path="/wishlist" element={<WishlistCount />} />
                <Route path="/products" element={<ProductCard />} /> 
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/AddToCart" element={<AddToCart />} /> 
                <Route path="/checkout" element={<Cheakout />} /> 
                <Route path="/offers" element={<Offers />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/about" element={<About />} />

                {/* --- 🔹 Admin Auth --- */}
                <Route path="/admin-login" element={<AdminLoginPage />} />
                <Route path="/admin-register" element={<Register />} />
                <Route path="/admin-logout" element={<Logout />} />
                
                {/* --- 🔹 Protected Admin Routes --- */}
                <Route path="/admin-dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin-orders" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/manage-categories" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin-users" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin-settings" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin-reports" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                
                {/* Admin Product Views */}
                <Route path="/admin/product-list" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/add-product" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/edit-product/:productId" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

                {/* ✅ ADDED: Admin Delete Product */}
                <Route path="/admin/delete-product/:productId" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                
                {/* --- 🔹 Fallback Route --- */}
                <Route path="*" element={<h2 style={{ textAlign: "center", marginTop: "100px" }}>404 - Page Not Found</h2>} />
            </Routes>
            
            {/* User Layout Footer */}
            {shouldRenderLayout && <Footer />}
        </>
    );
}

// 💡 Root App Component
export default function App() {
    return (
        <Router> 
            <MainAppContent />
        </Router>
    );
}