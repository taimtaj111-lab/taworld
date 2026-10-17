```php
<?php

// D:\xampp\htdocs\project2\backend\Product\ProductUpdate.php

ob_start();

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// ----------------------------------------------------
// OPTIONS
// ----------------------------------------------------

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {

    http_response_code(200);
    exit();
}

include("../config/connect.php");

// ====================================================
// CONFIGURATION
// ====================================================

$upload_dir = realpath(__DIR__ . "/../../uploads/");

if ($upload_dir === false || !is_dir($upload_dir)) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "error" => "Upload directory not found."
    ]);

    exit();
}

$relative_base_path = "project2/uploads/";

$allowed_mimes = [
    "image/jpeg" => "jpg",
    "image/png"  => "png",
    "image/webp" => "webp"
];

$max_main_size  = 5 * 1024 * 1024; // 5 MB
$max_other_size = 4 * 1024 * 1024; // 4 MB

$max_other_images = 4;


// ====================================================
// HELPER FUNCTIONS
// ====================================================

function jsonResponse($data, $status = 200)
{
    http_response_code($status);

    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE
    );

    exit();
}


// ----------------------------------------------------
// Validate product image path
// ----------------------------------------------------

function isValidProductImagePath($path)
{
    return (
        is_string($path) &&
        strpos($path, "project2/uploads/") === 0
    );
}


// ----------------------------------------------------
// Get safe full path from stored relative path
// ----------------------------------------------------

function getSafeImagePath($upload_dir, $relative_path)
{
    if (!isValidProductImagePath($relative_path)) {
        return false;
    }

    $filename = substr(
        $relative_path,
        strlen("project2/uploads/")
    );

    // Prevent directory traversal
    $filename = basename($filename);

    if ($filename === '') {
        return false;
    }

    return $upload_dir . DIRECTORY_SEPARATOR . $filename;
}


// ----------------------------------------------------
// Delete image safely
// ----------------------------------------------------

function deleteImageFile($upload_dir, $relative_path)
{
    $full_path = getSafeImagePath(
        $upload_dir,
        $relative_path
    );

    if ($full_path === false) {
        return false;
    }

    $real_file = realpath($full_path);

    if (
        $real_file !== false &&
        strpos(
            $real_file,
            $upload_dir . DIRECTORY_SEPARATOR
        ) === 0 &&
        is_file($real_file)
    ) {
        return @unlink($real_file);
    }

    return false;
}


// ----------------------------------------------------
// Generate secure filename
// ----------------------------------------------------

function generateSecureFilename($extension, $prefix)
{
    return $prefix . bin2hex(random_bytes(16)) . "." . $extension;
}


// ----------------------------------------------------
// Upload image
// ----------------------------------------------------

function uploadImage(
    $file,
    $upload_dir,
    $relative_base_path,
    $allowed_mimes,
    $max_size,
    $prefix
) {

    if (
        !isset($file['error']) ||
        $file['error'] !== UPLOAD_ERR_OK
    ) {
        return [
            "success" => false,
            "error" => "Invalid upload."
        ];
    }

    // File size
    if ($file['size'] <= 0 || $file['size'] > $max_size) {

        return [
            "success" => false,
            "error" => "Image size is too large."
        ];
    }

    // MIME detection using finfo
    $finfo = new finfo(FILEINFO_MIME_TYPE);

    $mime = $finfo->file($file['tmp_name']);

    if (!isset($allowed_mimes[$mime])) {

        return [
            "success" => false,
            "error" => "Only JPG, PNG and WEBP images are allowed."
        ];
    }

    // Verify actual image
    $image_info = @getimagesize($file['tmp_name']);

    if ($image_info === false) {

        return [
            "success" => false,
            "error" => "Uploaded file is not a valid image."
        ];
    }

    $extension = $allowed_mimes[$mime];

    $filename = generateSecureFilename(
        $extension,
        $prefix
    );

    $destination =
        $upload_dir .
        DIRECTORY_SEPARATOR .
        $filename;

    if (
        !move_uploaded_file(
            $file['tmp_name'],
            $destination
        )
    ) {

        return [
            "success" => false,
            "error" => "Failed to save uploaded image."
        ];
    }

    return [
        "success" => true,
        "relative_path" =>
            $relative_base_path . $filename,
        "full_path" => $destination
    ];
}


// ====================================================
// GET PRODUCT
// ====================================================

if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    $id = isset($_GET['id'])
        ? filter_var(
            $_GET['id'],
            FILTER_VALIDATE_INT
        )
        : false;

    if ($id === false || $id <= 0) {

        jsonResponse([
            "success" => false,
            "error" => "Invalid Product ID."
        ], 400);
    }

    $stmt = $conn->prepare(
        "SELECT *
         FROM products
         WHERE id = ?
         LIMIT 1"
    );

    $stmt->bind_param("i", $id);
    $stmt->execute();

    $result = $stmt->get_result();

    $row = $result->fetch_assoc();

    $stmt->close();
    $conn->close();

    if (!$row) {

        jsonResponse([
            "success" => false,
            "error" => "Product not found."
        ], 404);
    }

    // Decode JSON fields
    $decoded_sizes = json_decode(
        $row['size_options'] ?? '[]',
        true
    );

    $decoded_other = json_decode(
        $row['other_images'] ?? '[]',
        true
    );

    $row['size_options'] =
        is_array($decoded_sizes)
        ? $decoded_sizes
        : [];

    $row['other_images'] =
        is_array($decoded_other)
        ? $decoded_other
        : [];

    $row['main_image_path'] =
        $row['main_image'] ?? "";

    jsonResponse([
        "success" => true,
        "product" => $row
    ]);
}


// ====================================================
// ONLY POST AFTER THIS POINT
// ====================================================

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {

    jsonResponse([
        "success" => false,
        "error" => "Method not allowed."
    ], 405);
}


// ====================================================
// PRODUCT ID
// ====================================================

$id = isset($_POST['product_id'])
    ? filter_var(
        $_POST['product_id'],
        FILTER_VALIDATE_INT
    )
    : false;

if ($id === false || $id <= 0) {

    jsonResponse([
        "success" => false,
        "error" => "Invalid Product ID."
    ], 400);
}


// ====================================================
// INPUT DATA
// ====================================================

$name = trim($_POST['name'] ?? '');

$category_id = filter_var(
    $_POST['category_id'] ?? 0,
    FILTER_VALIDATE_INT
);

$subcategory_id_raw =
    $_POST['subcategory_id'] ?? '';

$product_code =
    trim($_POST['product_code'] ?? '');

$price =
    filter_var(
        $_POST['price'] ?? 0,
        FILTER_VALIDATE_FLOAT
    );

$discount_price_raw =
    $_POST['discount_price'] ?? '';

$stock =
    filter_var(
        $_POST['stock'] ?? 0,
        FILTER_VALIDATE_INT
    );

$short_description =
    trim($_POST['short_description'] ?? '');

$description =
    trim($_POST['description'] ?? '');

$tags =
    trim($_POST['tags'] ?? '');

$size_options_json =
    $_POST['size_options'] ?? '[]';

$delivery_charge =
    filter_var(
        $_POST['delivery_charge'] ?? 0,
        FILTER_VALIDATE_FLOAT
    );


// ====================================================
// REQUIRED VALIDATION
// ====================================================

if ($name === '') {

    jsonResponse([
        "success" => false,
        "error" => "Product name is required."
    ], 400);
}

if ($category_id === false || $category_id <= 0) {

    jsonResponse([
        "success" => false,
        "error" => "Valid category is required."
    ], 400);
}

if ($price === false || $price <= 0) {

    jsonResponse([
        "success" => false,
        "error" => "Valid regular price is required."
    ], 400);
}

if ($stock === false || $stock < 0) {

    jsonResponse([
        "success" => false,
        "error" => "Valid stock quantity is required."
    ], 400);
}

if ($short_description === '') {

    jsonResponse([
        "success" => false,
        "error" => "Short description is required."
    ], 400);
}

if ($delivery_charge === false || $delivery_charge < 0) {
    $delivery_charge = 0;
}


// ====================================================
// DISCOUNT PRICE
// ====================================================

$discount_price_db = null;

if (
    $discount_price_raw !== '' &&
    is_numeric($discount_price_raw)
) {

    $discount_price_value =
        (float)$discount_price_raw;

    if (
        $discount_price_value > 0 &&
        $discount_price_value < $price
    ) {

        $discount_price_db =
            $discount_price_value;

    } elseif ($discount_price_value == $price) {

        $discount_price_db = $discount_price_value;

    } elseif ($discount_price_value > $price) {

        jsonResponse([
            "success" => false,
            "error" => "Discount price cannot be greater than regular price."
        ], 400);
    }
}


// ====================================================
// SUBCATEGORY
// ====================================================

$subcategory_id_db = null;

if (
    $subcategory_id_raw !== '' &&
    is_numeric($subcategory_id_raw)
) {

    $subcategory_value =
        (int)$subcategory_id_raw;

    if ($subcategory_value > 0) {
        $subcategory_id_db =
            $subcategory_value;
    }
}


// ====================================================
// SIZE OPTIONS VALIDATION
// ====================================================

$size_options = json_decode(
    $size_options_json,
    true
);

if (!is_array($size_options)) {
    $size_options = [];
}

$allowed_sizes = [
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL"
];

$size_options = array_values(
    array_intersect(
        $size_options,
        $allowed_sizes
    )
);

$size_options_json =
    json_encode(
        $size_options,
        JSON_UNESCAPED_UNICODE
    );


// ====================================================
// GET CURRENT PRODUCT
// ====================================================

$stmt_get = $conn->prepare(
    "SELECT
        id,
        main_image,
        other_images
     FROM products
     WHERE id = ?
     LIMIT 1"
);

$stmt_get->bind_param("i", $id);
$stmt_get->execute();

$result =
    $stmt_get->get_result();

$current_data =
    $result->fetch_assoc();

$stmt_get->close();

if (!$current_data) {

    jsonResponse([
        "success" => false,
        "error" => "Product not found."
    ], 404);
}


// ====================================================
// OLD IMAGE DATA
// ====================================================

$old_main_image =
    $current_data['main_image'] ?? '';

$old_other_images =
    json_decode(
        $current_data['other_images'] ?? '[]',
        true
    );

if (!is_array($old_other_images)) {
    $old_other_images = [];
}


// ====================================================
// EXISTING OTHER IMAGES FROM REACT
// ====================================================

$existing_other_images_raw =
    $_POST['existing_other_images'] ?? '[]';

$existing_other_images =
    json_decode(
        $existing_other_images_raw,
        true
    );

if (!is_array($existing_other_images)) {
    $existing_other_images = [];
}


// ----------------------------------------------------
// Security:
// Only allow existing images that actually belonged
// to this product.
// ----------------------------------------------------

$existing_other_images =
    array_values(
        array_intersect(
            $existing_other_images,
            $old_other_images
        )
    );


// ====================================================
// MAX OTHER IMAGES
// ====================================================

if (
    count($existing_other_images)
    > $max_other_images
) {

    jsonResponse([
        "success" => false,
        "error" => "Maximum 4 other images are allowed."
    ], 400);
}


// ====================================================
// NEW FILES COUNT
// ====================================================

$new_other_count = 0;

if (
    isset($_FILES['new_other_images']) &&
    is_array($_FILES['new_other_images']['name'])
) {

    $new_other_count =
        count($_FILES['new_other_images']['name']);
}

if (
    count($existing_other_images)
    + $new_other_count
    > $max_other_images
) {

    jsonResponse([
        "success" => false,
        "error" => "Maximum 4 other images are allowed."
    ], 400);
}


// ====================================================
// PREPARE IMAGE VARIABLES
// ====================================================

$main_image_path =
    $old_main_image;

$updated_other_images =
    $existing_other_images;

$new_uploaded_files = [];


// ====================================================
// NEW MAIN IMAGE
// ====================================================

if (
    isset($_FILES['main_image_file']) &&
    $_FILES['main_image_file']['error']
    !== UPLOAD_ERR_NO_FILE
) {

    $upload_result = uploadImage(
        $_FILES['main_image_file'],
        $upload_dir,
        $relative_base_path,
        $allowed_mimes,
        $max_main_size,
        "main_"
    );

    if (!$upload_result['success']) {

        jsonResponse([
            "success" => false,
            "error" => $upload_result['error']
        ], 400);
    }

    $main_image_path =
        $upload_result['relative_path'];

    $new_uploaded_files[] =
        $main_image_path;
}


// ====================================================
// NEW OTHER IMAGES
// ====================================================

if (
    isset($_FILES['new_other_images']) &&
    is_array($_FILES['new_other_images']['name'])
) {

    $count =
        count($_FILES['new_other_images']['name']);

    for ($i = 0; $i < $count; $i++) {

        if (
            $_FILES['new_other_images']['error'][$i]
            === UPLOAD_ERR_NO_FILE
        ) {
            continue;
        }

        $single_file = [
            "name" =>
                $_FILES['new_other_images']['name'][$i],

            "type" =>
                $_FILES['new_other_images']['type'][$i],

            "tmp_name" =>
                $_FILES['new_other_images']['tmp_name'][$i],

            "error" =>
                $_FILES['new_other_images']['error'][$i],

            "size" =>
                $_FILES['new_other_images']['size'][$i]
        ];

        $upload_result = uploadImage(
            $single_file,
            $upload_dir,
            $relative_base_path,
            $allowed_mimes,
            $max_other_size,
            "other_"
        );

        if (!$upload_result['success']) {

            // Cleanup files already uploaded
            foreach ($new_uploaded_files as $uploaded_path) {
                deleteImageFile(
                    $upload_dir,
                    $uploaded_path
                );
            }

            jsonResponse([
                "success" => false,
                "error" => $upload_result['error']
            ], 400);
        }

        $updated_other_images[] =
            $upload_result['relative_path'];

        $new_uploaded_files[] =
            $upload_result['relative_path'];
    }
}


// ====================================================
// FINAL OTHER IMAGE JSON
// ====================================================

$other_images_json =
    json_encode(
        $updated_other_images,
        JSON_UNESCAPED_UNICODE
    );


// ====================================================
// DATABASE UPDATE
// ====================================================

try {

    $sql = "
        UPDATE products SET
            product_name = ?,
            category_id = ?,
            subcategory_id = ?,
            product_code = ?,
            regular_price = ?,
            discount_price = ?,
            stock = ?,
            short_description = ?,
            full_description = ?,
            tags = ?,
            size_options = ?,
            main_image = ?,
            other_images = ?,
            delivery_charge = ?
        WHERE id = ?
    ";

    $stmt = $conn->prepare($sql);

    $stmt->bind_param(
        "siisddissssssdi",

        $name,
        $category_id,
        $subcategory_id_db,
        $product_code,

        $price,
        $discount_price_db,

        $stock,

        $short_description,
        $description,
        $tags,

        $size_options_json,

        $main_image_path,

        $other_images_json,

        $delivery_charge,

        $id
    );

    $stmt->execute();

    $stmt->close();

} catch (mysqli_sql_exception $e) {

    // -----------------------------------------------
    // DB update failed
    // Delete newly uploaded files
    // -----------------------------------------------

    foreach ($new_uploaded_files as $uploaded_path) {

        deleteImageFile(
            $upload_dir,
            $uploaded_path
        );
    }

    $conn->close();

    jsonResponse([
        "success" => false,
        "error" => "Product update failed."
    ], 500);
}


// ====================================================
// DELETE OLD MAIN IMAGE
// ====================================================

if (
    $old_main_image !== '' &&
    $main_image_path !== $old_main_image
) {

    deleteImageFile(
        $upload_dir,
        $old_main_image
    );
}


// ====================================================
// DELETE REMOVED OTHER IMAGES
// ====================================================

$removed_other_images =
    array_diff(
        $old_other_images,
        $existing_other_images
    );

foreach (
    $removed_other_images
    as $removed_image
) {

    deleteImageFile(
        $upload_dir,
        $removed_image
    );
}


// ====================================================
// SUCCESS
// ====================================================

$conn->close();

jsonResponse([
    "success" => true,
    "message" => "Product updated successfully.",
    "main_image_path" => $main_image_path,
    "other_images" => $updated_other_images
]);

?>
```
