<?php
include("../../config/connect.php");

$data = json_decode(file_get_contents("php://input"));
$subcategory_name = trim($data->subcategory_name ?? '');
$parent_category_id = (int)($data->parent_category_id ?? 0);

if (empty($subcategory_name) || $parent_category_id <= 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Subcategory name and valid Parent Category are required."]);
    $conn->close();
    exit();
}

// Slug Generator
$slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $subcategory_name)));
$final_slug = $slug;
$i = 1;

try {
    // Unique Slug check within parent category
    $stmt_check = $conn->prepare("SELECT id FROM subcategories WHERE (subcategory_name = ? OR slug = ?) AND category_id = ?");
    while (true) {
        $stmt_check->bind_param("ssi", $subcategory_name, $final_slug, $parent_category_id);
        $stmt_check->execute();
        $result_check = $stmt_check->get_result();
        
        if ($result_check->num_rows == 0) {
            break;
        }
        $final_slug = $slug . '-' . $i++;
    }
    $stmt_check->close();

    // Insert subcategory
    $stmt = $conn->prepare("INSERT INTO subcategories (category_id, subcategory_name, slug) VALUES (?, ?, ?)");
    $stmt->bind_param("iss", $parent_category_id, $subcategory_name, $final_slug);

    if ($stmt->execute()) {
        http_response_code(201);
        echo json_encode(["success" => true, "message" => "Subcategory added successfully.", "id" => $conn->insert_id]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Failed to add subcategory."]);
    }
    $stmt->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}

$conn->close();
?>