<?php
// ফাইল পাথ: C:\xampp\htdocs\project2\backend\Admin\manage_categories\CategoryFetch.php

require_once "../../config/cors.php";
require_once "../../config/connect.php";
// OPTIONS প্রিফ্লাইট রিকোয়েস্ট হ্যান্ডলিং
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 💡 ডিবাগিংয়ের জন্য: error_reporting চালু রাখুন
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 2. ডেটাবেস সংযোগ ফাইল অন্তর্ভুক্ত করা
// ⬇️ নতুন পাথ: দুই ধাপ উপরে গিয়ে config ফোল্ডারে যাওয়া ⬇️
require_once '../../../config/connect.php'; 

$response = ["success" => false, "categories" => []]; 

try {
    // 3. ক্যাটাগরি এবং প্রোডাক্ট সংখ্যা সহ কোয়েরি 
    $sql_categories = "
        SELECT 
            c.id, 
            c.category_name, 
            c.slug,
            COUNT(p.id) AS product_count 
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id
        GROUP BY c.id, c.category_name, c.slug
        ORDER BY c.category_name ASC";

    $result_categories = $conn->query($sql_categories);
    $categories = [];

    if ($result_categories) {
        while ($row = $result_categories->fetch_assoc()) {
            $row['product_count'] = (int)$row['product_count'];
            $categories[] = $row;
        }
    }
    
    // 4. চূড়ান্ত JSON আউটপুট
    http_response_code(200);
    echo json_encode(["success" => true, "categories" => $categories], JSON_UNESCAPED_UNICODE);

} catch (\Exception $e) {
    // 5. সার্ভার এরর হ্যান্ডলিং
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
} finally {
    // 6. সংযোগ বন্ধ করা
    if (isset($conn)) {
        $conn->close();
    } 
}
?>