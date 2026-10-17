<?php
// C:\xampp\htdocs\project2\backend\Admin\Dashboard\get_dashboard_stats.php

// 1. --- CORS Headers ---
// এই হেডারগুলি React (http://localhost:5173) থেকে অ্যাক্সেসের অনুমতি দেবে
require_once "../../config/cors.php";
require_once "../../config/connect.php";
// OPTIONS রিকোয়েস্ট হ্যান্ডলিং (CORS প্রি-ফ্লাইট)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
// --- CORS Headers শেষ ---

// 2. ডেটাবেস সংযোগ ফাইল অন্তর্ভুক্ত করা
// 'Dashboard' ফোল্ডার থেকে Admin ফোল্ডারে (../) এবং তারপর backend ফোল্ডারে (../) 
// এবং সবশেষে 'config' ফোল্ডারে যেতে হলে:
require_once '../../config/connect.php'; 

$response = ["success" => false, "message" => "Failed to fetch stats."];

try {
    // 3. পরিসংখ্যান ফেচ করার জন্য SQL কোয়েরিগুলি
    
    // A. মোট প্রোডাক্ট সংখ্যা
    $sql_products = "SELECT COUNT(id) as totalProducts FROM products";
    $result_products = $conn->query($sql_products);
    $totalProducts = $result_products->fetch_assoc()['totalProducts'] ?? 0;

    // B. মোট অর্ডার সংখ্যা
    $sql_orders = "SELECT COUNT(id) as totalOrders FROM orders";
    $result_orders = $conn->query($sql_orders);
    $totalOrders = $result_orders->fetch_assoc()['totalOrders'] ?? 0;
    
    // C. আজকের অর্ডার সংখ্যা (গত 24 ঘন্টায় তৈরি অর্ডার)
    $sql_today_orders = "SELECT COUNT(id) as todayOrders FROM orders WHERE created_at >= NOW() - INTERVAL 1 DAY";
    $result_today_orders = $conn->query($sql_today_orders);
    $todayOrders = $result_today_orders->fetch_assoc()['todayOrders'] ?? 0;

    // 4. চূড়ান্ত JSON রেসপন্স তৈরি
    $response = [
        "success" => true,
        "totalProducts" => (int)$totalProducts,
        "totalOrders" => (int)$totalOrders,
        "todayOrders" => (int)$todayOrders,
        "message" => "Dashboard stats fetched successfully."
    ];
    http_response_code(200);

} catch (\Exception $e) {
    // 5. কোনো ত্রুটি ঘটলে সার্ভার এরর রেসপন্স
    http_response_code(500);
    $response["message"] = "Server error: " . $e->getMessage();
} finally {
    // 6. ডেটাবেস সংযোগ বন্ধ করা
    if (isset($conn)) {
        $conn->close();
    }
    // 7. JSON আউটপুট
    echo json_encode($response);
}
?>