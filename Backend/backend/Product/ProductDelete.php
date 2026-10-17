```php
<?php

// D:\xampp\htdocs\project2\backend\Product\ProductDelete.php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// ----------------------------------------------------
// OPTIONS / Preflight
// ----------------------------------------------------

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ----------------------------------------------------
// Only POST allowed
// ----------------------------------------------------

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

    http_response_code(405);

    echo json_encode([
        "success" => false,
        "message" => "Method not allowed."
    ]);

    exit();
}

include("../config/connect.php");

// ----------------------------------------------------
// Get Product ID
// ----------------------------------------------------

$id = isset($_POST['product_id'])
    ? filter_var($_POST['product_id'], FILTER_VALIDATE_INT)
    : false;

if ($id === false || $id <= 0) {

    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Invalid Product ID."
    ]);

    exit();
}

// ----------------------------------------------------
// Upload directory
// ----------------------------------------------------

$upload_dir = realpath(__DIR__ . "/../../uploads/");

if ($upload_dir === false || !is_dir($upload_dir)) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Upload directory not found."
    ]);

    $conn->close();
    exit();
}

try {

    // ------------------------------------------------
    // 1. Get product
    // ------------------------------------------------

    $stmt_get = $conn->prepare(
        "SELECT id, main_image, other_images
         FROM products
         WHERE id = ?
         LIMIT 1"
    );

    $stmt_get->bind_param("i", $id);
    $stmt_get->execute();

    $result = $stmt_get->get_result();

    $product = $result->fetch_assoc();

    $stmt_get->close();

    // ------------------------------------------------
    // Product not found
    // ------------------------------------------------

    if (!$product) {

        http_response_code(404);

        echo json_encode([
            "success" => false,
            "message" => "Product not found."
        ]);

        $conn->close();
        exit();
    }

    // ------------------------------------------------
    // 2. Collect image paths
    // ------------------------------------------------

    $images_to_delete = [];

    // Main image
    if (!empty($product['main_image'])) {
        $images_to_delete[] = $product['main_image'];
    }

    // Other images
    $other_images = json_decode(
        $product['other_images'] ?? '[]',
        true
    );

    if (is_array($other_images)) {

        foreach ($other_images as $image_path) {

            if (
                is_string($image_path) &&
                $image_path !== ''
            ) {
                $images_to_delete[] = $image_path;
            }
        }
    }

    // ------------------------------------------------
    // 3. Delete database record first
    // ------------------------------------------------

    $stmt = $conn->prepare(
        "DELETE FROM products WHERE id = ?"
    );

    $stmt->bind_param("i", $id);
    $stmt->execute();

    if ($stmt->affected_rows <= 0) {

        $stmt->close();
        $conn->close();

        http_response_code(404);

        echo json_encode([
            "success" => false,
            "message" => "Product could not be deleted."
        ]);

        exit();
    }

    $stmt->close();

    // ------------------------------------------------
    // 4. Delete associated image files
    // ------------------------------------------------

    foreach ($images_to_delete as $relative_path) {

        // Only allow our own project2/uploads paths
        if (
            strpos($relative_path, "project2/uploads/") !== 0
        ) {
            continue;
        }

        // Remove project2/uploads/ prefix
        $filename = substr(
            $relative_path,
            strlen("project2/uploads/")
        );

        // Prevent directory traversal
        $filename = basename($filename);

        if ($filename === '') {
            continue;
        }

        $full_path = $upload_dir . DIRECTORY_SEPARATOR . $filename;

        // Extra safety: make sure file is inside upload directory
        $real_file = realpath($full_path);

        if (
            $real_file !== false &&
            strpos($real_file, $upload_dir . DIRECTORY_SEPARATOR) === 0 &&
            is_file($real_file)
        ) {
            @unlink($real_file);
        }
    }

    // ------------------------------------------------
    // Success
    // ------------------------------------------------

    $conn->close();

    echo json_encode([
        "success" => true,
        "message" => "Product and associated images deleted successfully.",
        "product_id" => $id
    ]);

} catch (mysqli_sql_exception $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Failed to delete product."
    ]);

    $conn->close();
}
?>
```
