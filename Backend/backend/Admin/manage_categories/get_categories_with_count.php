<?php
include("../../config/connect.php"); 

try {
    // 1. Fetch all main categories with total product counts
    $sql_categories = "
        SELECT 
            c.id, 
            c.category_name,
            c.slug,
            COUNT(p.id) AS product_count 
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id
        GROUP BY c.id
        ORDER BY c.category_name ASC";
        
    $res_categories = $conn->query($sql_categories);
    $categories = [];

    if ($res_categories) {
        while ($row = $res_categories->fetch_assoc()) {
            $cat_id = (int)$row['id'];
            
            // 2. Fetch subcategories for each category
            $sql_sub = "
                SELECT 
                    s.id, 
                    s.subcategory_name, 
                    s.slug, 
                    COUNT(p.id) AS product_count 
                FROM subcategories s
                LEFT JOIN products p ON s.id = p.subcategory_id
                WHERE s.category_id = ?
                GROUP BY s.id
                ORDER BY s.subcategory_name ASC";

            $stmt_sub = $conn->prepare($sql_sub);
            $stmt_sub->bind_param("i", $cat_id);
            $stmt_sub->execute();
            $sub_result = $stmt_sub->get_result();

            $subcategories = [];
            while ($sub_row = $sub_result->fetch_assoc()) {
                $subcategories[] = [
                    "id" => (int)$sub_row['id'],
                    "subcategory_name" => $sub_row['subcategory_name'],
                    "slug" => $sub_row['slug'],
                    "product_count" => (int)$sub_row['product_count']
                ];
            }
            $stmt_sub->close();

            $categories[] = [
                "id" => $cat_id,
                "category_name" => $row['category_name'],
                "slug" => $row['slug'],
                "product_count" => (int)$row['product_count'],
                "subcategories" => $subcategories
            ];
        }
    }

    echo json_encode(["success" => true, "categories" => $categories]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Query Error: " . $e->getMessage()]);
}

$conn->close();
?>