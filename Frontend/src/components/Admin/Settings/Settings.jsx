import React, { useState } from 'react';
import { 
  FaUserCog, FaCogs, FaShieldAlt, FaEnvelope, 
  FaCreditCard, FaGlobe, FaSave, FaUserPlus, FaTrash 
} from 'react-icons/fa';
import './Settings.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');

  // ডামি ডেটা (এগুলো পরে API থেকে আসবে)
  const users = [
    { id: 1, name: 'Admin User', email: 'admin@tajworld.com', role: 'Super Admin' },
    { id: 2, name: 'Manager One', email: 'manager@tajworld.com', role: 'Manager' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="tab-pane animate-fade-in">
            <h3>General Configuration</h3>
            <div className="form-grid">
              <div className="input-group">
                <label>Site Name</label>
                <input type="text" placeholder="TajWorld" />
              </div>
              <div className="input-group">
                <label>Site Logo</label>
                <input type="file" className="file-input" />
              </div>
              <div className="input-group full-width">
                <label>Meta Description</label>
                <textarea placeholder="Write site description for SEO..."></textarea>
              </div>
            </div>
          </div>
        );
      case 'users':
        return (
          <div className="tab-pane animate-fade-in">
            <div className="tab-header">
              <h3>User Management & Roles</h3>
              <button className="btn-add"><FaUserPlus /> Add New User</button>
            </div>
            <table className="settings-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td><span className="role-badge">{user.role}</span></td>
                    <td className="actions">
                      <button className="edit-btn">Edit</button>
                      <button className="delete-btn"><FaTrash /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'security':
        return (
          <div className="tab-pane animate-fade-in">
            <h3>Security & Maintenance</h3>
            <div className="toggle-group">
              <div className="toggle-item">
                <div>
                  <h4>Maintenance Mode</h4>
                  <p>Disable frontend access for customers</p>
                </div>
                <input type="checkbox" className="switch" />
              </div>
              <div className="toggle-item">
                <div>
                  <h4>Two-Factor Authentication</h4>
                  <p>Add an extra layer of security</p>
                </div>
                <input type="checkbox" className="switch" defaultChecked />
              </div>
            </div>
          </div>
        );
      case 'payment':
        return (
          <div className="tab-pane animate-fade-in">
            <h3>Payment Gateways</h3>
            <div className="gateway-cards">
              <div className="gateway-card">
                <FaCreditCard className="icon" />
                <h4>SSLCommerz</h4>
                <button className="btn-config">Configure</button>
              </div>
              <div className="gateway-card">
                <FaGlobe className="icon" />
                <h4>Stripe / PayPal</h4>
                <button className="btn-config">Configure</button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="admin-settings-container">
      <div className="settings-header">
        <h2><FaCogs /> Site Settings</h2>
        <button className="save-all-btn"><FaSave /> Save Changes</button>
      </div>

      <div className="settings-layout">
        {/* Sidebar Tabs */}
        <aside className="settings-sidebar">
          <button className={activeTab === 'general' ? 'active' : ''} onClick={() => setActiveTab('general')}>
            <FaGlobe /> General
          </button>
          <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
            <FaUserCog /> User Management
          </button>
          <button className={activeTab === 'payment' ? 'active' : ''} onClick={() => setActiveTab('payment')}>
            <FaCreditCard /> Payments
          </button>
          <button className={activeTab === 'security' ? 'active' : ''} onClick={() => setActiveTab('security')}>
            <FaShieldAlt /> Security
          </button>
          <button className={activeTab === 'email' ? 'active' : ''} onClick={() => setActiveTab('email')}>
            <FaEnvelope /> Email Config
          </button>
        </aside>

        {/* Content Area */}
        <main className="settings-content">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
};

export default Settings;