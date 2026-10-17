<?php
// C:\xampp\htdocs\project2\backend\Product\ProductGet.php
// --- CORS Headers ---
header("Access-Control-Allow-Origin: *"); 
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Max-Age: 3600"); 
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
// --- CORS Headers শেষ ---

include("../config/connect.php");

$id = $_GET['id'] ?? null;

if (!$id) {
    http_response_code(400);
    echo json_encode(["message" => "Product ID is required."]);
    exit();
}

// Prepare statement
$stmt = $conn->prepare("SELECT * FROM products WHERE id = ?");

if ($stmt === false) {
    http_response_code(500);
    echo json_encode(["message" => "SQL Prepare failed: " . $conn->error]);
    exit();
}

$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();

if($result->num_rows > 0){
    $product = $result->fetch_assoc();
    
    // ✅ BASE URL নিশ্চিত করা হলো
    $BASE_URL = "http://localhost/project2/uploads/";
    
    // 1. images অ্যারে তৈরি:
    $images = [];
    
    // Main Image কে Full URL এ রূপান্তর
    if (!empty($product['main_image'])) {
        $img_path = $product['main_image'];
        $main_image_url = (strpos($img_path, 'http') === 0) 
            ? $img_path 
            : $BASE_URL . basename($img_path);
        $images[] = $main_image_url;
    }
    
    $other_images_arr = json_decode($product['other_images'] ?? '[]', true);
    if (is_array($other_images_arr)) {
        foreach($other_images_arr as $img_path) {
            $other_image_url = (strpos($img_path, 'http') === 0) 
                ? $img_path 
                : $BASE_URL . basename($img_path);
            $images[] = $other_image_url;
        }
    }
    
    $product['images'] = $images;
    
    // 2. size_options ডি-কোড করা
    try {
        $product['size_options'] = json_decode($product['size_options'] ?? '[]', true);
        $product['size_options'] = is_array($product['size_options']) ? $product['size_options'] : [];
    } catch (\Throwable $th) {
        $product['size_options'] = [];
    }
    
    // 3. ডেটা টাইপ ঠিক করা
    $product['regular_price'] = (float)($product['regular_price'] ?? 0.00);
    $product['discount_price'] = (float)($product['discount_price'] ?? 0.00);
    $product['delivery_charge'] = (float)($product['delivery_charge'] ?? 0.00);
    $product['stock'] = (int)($product['stock'] ?? 0);
    
    // 4. অপ্রয়োজনীয় ফিল্ড বাদ দেওয়া হলো
    unset($product['other_images']); 
    unset($product['main_image']); 
    
    echo json_encode($product);
} else {
    http_response_code(404);
    echo json_encode(["message" => "Product not found."]);
}

$stmt->close();
$conn->close();
?>