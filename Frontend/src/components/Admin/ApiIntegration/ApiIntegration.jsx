// C:\React Project\project2\src\components\Admin\ApiIntegration\ApiIntegration.jsx

import React from 'react';
// import AdminHeader from '../AdminHeader/AdminHeader'; // ❌ এই ইমপোর্টটি দরকার নেই, কারণ ফাইলটি আর নেই।
// import AdminDashboardHeader from '../AdminHeader/AdminHeader'; // ❌ এই ইমপোর্টটিও দরকার নেই।

// 💡 AdminDashboardHeader কম্পোনেন্টটি যেহেতু আলাদাভাবে তৈরি করা হয়নি, 
// তাই আপাতত এই কম্পোনেন্টটিকে সরিয়ে দিন বা সাধারণ H2 ব্যবহার করুন।
// যদি আপনি AdminDashboardHeader কম্পোনেন্টটি AdminDashboard.jsx থেকে আলাদা করে তৈরি করে থাকেন, তবে তার সঠিক পাথ ব্যবহার করতে হবে।
// আপাতত, এরর এড়ানোর জন্য এটি মুছে ফেলা হলো।

export default function ApiIntegration() {
  return (
    // 💡 আপনার সকল Admin পেজকে একই রকম স্টাইল দেওয়ার জন্য এখানে একটি কন্টেইনার ব্যবহার করুন
    <div className="admin-page-container"> 
      
      <div className="admin-page-header"> 
        {/* AdminDashboardHeader এর বদলে একটি সাধারণ H2 হেডিং ব্যবহার করা হলো */}
        <h2>API Integration</h2>
      </div>

      <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3>Third-Party Integrations (Under Construction)</h3>
        <p>This page will handle integrations like payment gateways, SMS services, etc.</p>
      </div>
    </div>
  );
}