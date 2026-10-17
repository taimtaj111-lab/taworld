import React from 'react';
import './About.css';

const About = () => {
    return (
        <div className="about-page">
            <div className="container">
                <div className="about-section">
                    <h2>About Our Shop</h2>
                    <p>
                        Welcome to <strong>ShopMe</strong>! We are dedicated to providing the best quality products 
                        at the most affordable prices. Our mission is to make online shopping easy, 
                        reliable, and accessible for everyone.
                    </p>
                    <div className="about-features">
                        <div className="feature-card">
                            <h3>Quality Products</h3>
                            <p>We source our items from trusted brands and suppliers.</p>
                        </div>
                        <div className="feature-card">
                            <h3>Fast Delivery</h3>
                            <p>Get your products delivered to your doorstep in record time.</p>
                        </div>
                        <div className="feature-card">
                            <h3>24/7 Support</h3>
                            <p>Our team is always here to help you with any queries.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;