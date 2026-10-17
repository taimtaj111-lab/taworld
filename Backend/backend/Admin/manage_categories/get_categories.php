<?php
// C:\xampp\htdocs\project2\backend\Admin\manage_categories\get_categories.php

// ✅ 1. এরর আউটপুট বন্ধ করা (JSON নষ্ট হওয়া এড়াতে)
// এই লাইনগুলি যেকোনো Warning বা Notice কে ক্লায়েন্ট-এর কাছে যাওয়া থেকে আটকাবে।
error_reporting(0);
ini_set('display_errors', 0);

// 2. ডেটাবেস সংযোগ ফাইল অন্তর্ভুক্ত করা
// এটি $conn অবজেক্ট এবং হেডারগুলি সেট করবে।
require_once '../../config/connect.php'; 

// 💡 নোট: যেহেতু connect.php-তে হেডারগুলি সেট করা আছে, 
// তাই এই ফাইলে নতুন করে হেডার সেট করার প্রয়োজন নেই।

// OPTIONS হ্যান্ডলিং connect.php-তেই সম্পন্ন হবে।

$response = ["success" => false, "categories" => []]; // ডিফল্ট রেসপন্স

try {
    // 3. ক্যাটাগরি কোয়েরি
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
            $row['subcategories'] = []; 
            $categories[$row['id']] = $row;
        }
    }
    
    // 4. সাবক্যাটাগরি কোয়েরি
    $sql_subcategories = "
        SELECT 
            s.id, 
            s.category_id, 
            s.subcategory_name, 
            s.slug,
            COUNT(p.id) AS product_count
        FROM subcategories s
        LEFT JOIN products p ON s.id = p.subcategory_id
        GROUP BY s.id, s.category_id, s.subcategory_name, s.slug
        ORDER BY s.subcategory_name ASC";
        
    $result_subcategories = $conn->query($sql_subcategories);

    if ($result_subcategories) {
        while ($sub_row = $result_subcategories->fetch_assoc()) {
            $sub_row['product_count'] = (int)$sub_row['product_count'];
            $parent_id = $sub_row['category_id'];

            if (isset($categories[$parent_id])) {
                $categories[$parent_id]['subcategories'][] = $sub_row;
            }
        }
    }

    // 5. চূড়ান্ত JSON আউটপুট
    $categories_array = array_values($categories);
    http_response_code(200);
    echo json_encode(["success" => true, "categories" => $categories_array], JSON_UNESCAPED_UNICODE);

} catch (\Exception $e) {
    // 6. কোয়েরি বা অন্যান্য সার্ভার এরর হ্যান্ডলিং
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
} finally {
    // 7. সংযোগ বন্ধ করা
    if (isset($conn)) {
        $conn->close();
    }
}
?>