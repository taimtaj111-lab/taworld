import React, { useState } from 'react';
import './Contact.css';

const Contact = () => {
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        alert(`Thank you ${formData.name}! Your message has been sent.`);
        setFormData({ name: '', email: '', message: '' });
    };

    return (
        
        <div className="contact-page">
            <div className="container">
                <h2>Contact Us</h2>
                <div className="contact-wrapper">
                    <div className="contact-info">
                        <h3>Get In Touch</h3>
                        <p><strong>Address:</strong> Dhaka, Bangladesh</p>
                        <p><strong>Email:</strong> support@shopme.com</p>
                        <p><strong>Phone:</strong> +880 1234 567 890</p>
                    </div>
                    
                    <form className="contact-form" onSubmit={handleSubmit}>
                        <input 
                            type="text" 
                            placeholder="Your Name" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required 
                        />
                        <input 
                            type="email" 
                            placeholder="Your Email" 
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            required 
                        />
                        <textarea 
                            placeholder="Message" 
                            rows="5"
                            value={formData.message}
                            onChange={(e) => setFormData({...formData, message: e.target.value})}
                            required
                        ></textarea>
                        <button type="submit" className="submit-btn">Send Message</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Contact;