<?php
// D:\xampp\htdocs\project2\backend\Product\ProductAdd.php

ob_start();

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(); 
}

include("../config/connect.php"); 

if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Connection Error: " . $conn->connect_error]);
    ob_end_flush();
    exit();
}

$name = $_POST['name'] ?? null; 
$category_id = $_POST['category_id'] ?? null;
$subcategory_id = $_POST['subcategory_id'] ?? null;
$product_code = $_POST['product_code'] ?? '';
$price = $_POST['price'] ?? 0; 
$discount_price = $_POST['discount_price'] ?? null;
$stock = $_POST['stock'] ?? 0;
$short_description = $_POST['short_description'] ?? '';
$description = $_POST['description'] ?? ''; 
$tags = $_POST['tags'] ?? '';
$size_options_json = $_POST['size_options'] ?? '[]'; 
$delivery_charge = $_POST['delivery_charge'] ?? 0;

$price = is_numeric($price) ? (float)$price : 0.00;
$delivery_charge = is_numeric($delivery_charge) ? (float)$delivery_charge : 0.00;
$category_id = is_numeric($category_id) ? (int)$category_id : null;
$stock = is_numeric($stock) ? (int)$stock : 0;

$discount_price_db = is_numeric($discount_price) && (float)$discount_price > 0 ? (float)$discount_price : null;
$subcategory_id_db = is_numeric($subcategory_id) && (int)$subcategory_id > 0 ? (int)$subcategory_id : null; 

if (!$name || !$category_id || $price <= 0 || $stock === "" || $short_description === "") {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Required fields missing."]);
    ob_end_flush();
    exit();
}

// 💡 Relative Path Standardizing
$upload_dir = __DIR__ . "/../../uploads/"; 
$relative_base_path = "project2/uploads/";

if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

function uploadFile($file_info, $upload_dir, $relative_base_path) {
    if (!isset($file_info) || $file_info['error'] === UPLOAD_ERR_NO_FILE) {
        return ['success' => true, 'path' => null];
    }
    
    if ($file_info['error'] !== UPLOAD_ERR_OK) {
        return ['success' => false, 'message' => "Upload error code: " . $file_info['error']];
    }
    
    $ext = pathinfo($file_info['name'], PATHINFO_EXTENSION);
    $new_file_name = uniqid('prod_') . '_' . time() . '.' . $ext;
    $target_file = $upload_dir . $new_file_name;

    if (move_uploaded_file($file_info['tmp_name'], $target_file)) {
        return ['success' => true, 'path' => $relative_base_path . $new_file_name]; 
    } else {
        return ['success' => false, 'message' => "Failed to move uploaded file."];
    }
}

// Main Image
$main_image_path = null;
if (isset($_FILES['main_image'])) {
    $result = uploadFile($_FILES['main_image'], $upload_dir, $relative_base_path);
    if ($result['success']) {
        $main_image_path = $result['path'];
    }
}

if (empty($main_image_path)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Main image is required."]);
    ob_end_flush();
    exit();
}

// Other Images (Multiple)
$other_images_array = [];
if (isset($_FILES['other_images'])) {
    $count = count($_FILES['other_images']['name']);
    for ($i = 0; $i < $count; $i++) {
        if ($_FILES['other_images']['error'][$i] === UPLOAD_ERR_OK) {
             $file_info = [
                'name' => $_FILES['other_images']['name'][$i],
                'type' => $_FILES['other_images']['type'][$i],
                'tmp_name' => $_FILES['other_images']['tmp_name'][$i],
                'error' => $_FILES['other_images']['error'][$i],
                'size' => $_FILES['other_images']['size'][$i],
            ];
            $result = uploadFile($file_info, $upload_dir, $relative_base_path);
            if ($result['success'] && $result['path']) {
                $other_images_array[] = $result['path'];
            }
        }
    }
}

$other_images_json = json_encode($other_images_array);

$sql = "INSERT INTO products (
    product_name, category_id, subcategory_id, product_code, 
    regular_price, discount_price, stock, short_description, 
    full_description, tags, size_options, main_image, other_images, delivery_charge
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);
$stmt->bind_param("siisddissssssd", 
    $name, $category_id, $subcategory_id_db, $product_code, 
    $price, $discount_price_db, $stock, $short_description, 
    $description, $tags, $size_options_json, $main_image_path, $other_images_json, $delivery_charge
);

if ($stmt->execute()) {
    http_response_code(201);
    echo json_encode(["success" => true, "message" => "Product added successfully!", "id" => $conn->insert_id]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "MySQL Error: " . $stmt->error]); 
}

$stmt->close();
$conn->close();
ob_end_flush(); 
?>