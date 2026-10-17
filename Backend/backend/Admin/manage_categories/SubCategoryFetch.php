<?php
// ফাইল পাথ: C:\xampp\htdocs\project2\backend\Admin\manage_categories\SubCategoryFetch.php

require_once "../../config/cors.php";
require_once "../../config/connect.php";

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

$response = ["success" => false, "subcategories" => []]; 

try {
    // 3. সাবক্যাটাগরি এবং প্রোডাক্ট সংখ্যা সহ কোয়েরি
    $sql_subcategories = "
        SELECT 
            s.id, 
            s.category_id, 
            s.subcategory_name, 
            s.slug,
            c.category_name AS parent_category_name,
            COUNT(p.id) AS product_count
        FROM subcategories s
        LEFT JOIN categories c ON s.category_id = c.id
        LEFT JOIN products p ON s.id = p.subcategory_id
        GROUP BY s.id, s.category_id, s.subcategory_name, s.slug, c.category_name
        ORDER BY s.subcategory_name ASC";
        
    $result_subcategories = $conn->query($sql_subcategories);
    $subcategories = [];

    if ($result_subcategories) {
        while ($sub_row = $result_subcategories->fetch_assoc()) {
            $sub_row['product_count'] = (int)$sub_row['product_count'];
            $subcategories[] = $sub_row;
        }
    }
    
    // 4. চূড়ান্ত JSON আউটপুট
    http_response_code(200);
    echo json_encode(["success" => true, "subcategories" => $subcategories], JSON_UNESCAPED_UNICODE);

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