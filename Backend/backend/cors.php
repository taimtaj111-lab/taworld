<?php
// backend/cors.php

// ১. অনুমোদিত Origin-এর তালিকা (Localhost + Production)
$allowed_origins = [
    "https://tajworld.vercel.app",
    "http://localhost:5173", // Vite/React default port
    "http://localhost:3000"  // Create-React-App default port
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // বিকল্প হিসেবে প্রথম Origin সেট করা বা ডিফল্ট Vercel দেওয়া
    header("Access-Control-Allow-Origin: https://tajworld.vercel.app");
}

// ২. প্রয়োজনীয় CORS হেডারসমূহ
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// ৩. প্রি-ফ্লাইট OPTIONS রিকোয়েস্ট হ্যান্ডেল করা
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204); // 204 No Content standard for OPTIONS
    exit();
}

// ৪. আউটপুট বাফারিং শুরু
ob_start();

// ৫. এরর হ্যান্ডলিং
error_reporting(0);
ini_set('display_errors', 0);
?>