<?php
include("../../config/connect.php");

$data = json_decode(file_get_contents("php://input"));
$category_name = trim($data->category_name ?? '');

if (empty($category_name)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Category name cannot be empty."]);
    $conn->close();
    exit();
}

// Slug Generator
function create_slug($text) {
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);
    $text = preg_replace('~[^-\w]+~', '', $text);
    $text = trim($text, '-');
    $text = preg_replace('~-+~', '-', $text);
    $text = strtolower($text);
    return empty($text) ? 'n-a' : $text;
}

$slug = create_slug($category_name);

try {
    // Check duplicate category name
    $check_stmt = $conn->prepare("SELECT id FROM categories WHERE category_name = ?");
    $check_stmt->bind_param("s", $category_name);
    $check_stmt->execute();
    if ($check_stmt->get_result()->num_rows > 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "This category already exists."]);
        $check_stmt->close();
        exit();
    }
    $check_stmt->close();

    // Insert new category
    $stmt = $conn->prepare("INSERT INTO categories (category_name, slug) VALUES (?, ?)");
    $stmt->bind_param("ss", $category_name, $slug);

    if ($stmt->execute()) {
        http_response_code(201);
        echo json_encode(["success" => true, "message" => "Category added successfully.", "id" => $conn->insert_id]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Failed to add category."]);
    }
    $stmt->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server Error: " . $e->getMessage()]);
}

$conn->close();
?>