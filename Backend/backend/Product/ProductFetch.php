<?php

// ======================================================
// PRODUCT FETCH API
// ======================================================

// JSON Response
header("Content-Type: application/json; charset=UTF-8");

// ======================================================
// CORS
// ======================================================

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");


// ======================================================
// OPTIONS REQUEST
// ======================================================

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {

    http_response_code(200);

    echo json_encode([
        "success" => true,
        "message" => "CORS OK"
    ]);

    exit;
}


// ======================================================
// ONLY GET REQUEST
// ======================================================

if ($_SERVER["REQUEST_METHOD"] !== "GET") {

    http_response_code(405);

    echo json_encode([
        "success" => false,
        "message" => "Only GET request is allowed."
    ]);

    exit;
}


// ======================================================
// DATABASE CONNECTION
// ======================================================

require_once "../config/connect.php";


// Check connection
if (!isset($conn) || !$conn) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Database connection failed."
    ]);

    exit;
}


// Check connection error
if ($conn->connect_error) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Database connection error: " . $conn->connect_error
    ]);

    exit;
}


// ======================================================
// GET PARAMETERS
// ======================================================

// Limit
$limit = isset($_GET["limit"])
    ? (int) $_GET["limit"]
    : 1000;


// Limit validation
if ($limit <= 0) {
    $limit = 1000;
}


// Maximum limit
if ($limit > 1000) {
    $limit = 1000;
}


// Offset
$offset = isset($_GET["offset"])
    ? (int) $_GET["offset"]
    : 0;


if ($offset < 0) {
    $offset = 0;
}


// Category ID
$category_id = null;

if (
    isset($_GET["category_id"]) &&
    $_GET["category_id"] !== "" &&
    $_GET["category_id"] !== null
) {

    $category_id = (int) $_GET["category_id"];
}


// ======================================================
// MAIN QUERY
// ======================================================

$sql = "
    SELECT 
        p.*,
        c.category_name
    FROM products p
    LEFT JOIN categories c
        ON p.category_id = c.id
";


// Category filter
if ($category_id !== null && $category_id > 0) {

    $sql .= "
        WHERE p.category_id = ?
    ";

}


// Order + Pagination
$sql .= "
    ORDER BY p.id DESC
    LIMIT ?
    OFFSET ?
";


// ======================================================
// PREPARE STATEMENT
// ======================================================

$stmt = $conn->prepare($sql);


if (!$stmt) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "SQL prepare failed: " . $conn->error
    ]);

    $conn->close();

    exit;
}


// ======================================================
// BIND PARAMETERS
// ======================================================

if ($category_id !== null && $category_id > 0) {

    $stmt->bind_param(
        "iii",
        $category_id,
        $limit,
        $offset
    );

} else {

    $stmt->bind_param(
        "ii",
        $limit,
        $offset
    );

}


// ======================================================
// EXECUTE
// ======================================================

if (!$stmt->execute()) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "SQL execute failed: " . $stmt->error
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


// ======================================================
// GET RESULT
// ======================================================

$result = $stmt->get_result();


// Check result
if (!$result) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Failed to get database result."
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


// ======================================================
// PRODUCTS ARRAY
// ======================================================

$products = [];


// ======================================================
// IMAGE BASE URL
// ======================================================

$IMAGE_BASE_URL = "http://localhost/project2/uploads/";


// ======================================================
// FETCH PRODUCTS
// ======================================================

while ($row = $result->fetch_assoc()) {


    // ==================================================
    // PRODUCT ID
    // ==================================================

    $row["id"] = (int) ($row["id"] ?? 0);


    // ==================================================
    // CATEGORY ID
    // ==================================================

    $row["category_id"] = (int) ($row["category_id"] ?? 0);


    // ==================================================
    // SUBCATEGORY ID
    // ==================================================

    if (isset($row["subcategory_id"])) {

        $row["subcategory_id"] =
            (int) $row["subcategory_id"];

    }


    // ==================================================
    // PRICE
    // ==================================================

    $row["regular_price"] =
        (float) ($row["regular_price"] ?? 0);


    $row["discount_price"] =
        (float) ($row["discount_price"] ?? 0);


    // ==================================================
    // STOCK
    // ==================================================

    $row["stock"] =
        (int) ($row["stock"] ?? 0);


    // ==================================================
    // DELIVERY CHARGE
    // ==================================================

    if (isset($row["delivery_charge"])) {

        $row["delivery_charge"] =
            (float) $row["delivery_charge"];

    }


    // ==================================================
    // MAIN IMAGE
    // ==================================================

    $mainImage =
        trim($row["main_image"] ?? "");


    if ($mainImage !== "") {

        // যদি full URL already থাকে
        if (
            str_starts_with($mainImage, "http://") ||
            str_starts_with($mainImage, "https://")
        ) {

            $row["main_image_url"] =
                $mainImage;

        } else {

            // শুধু filename নেওয়া
            $filename =
                basename($mainImage);

            $row["main_image_url"] =
                $IMAGE_BASE_URL . $filename;
        }

    } else {

        $row["main_image_url"] = "";

    }


    // ==================================================
    // SIZE OPTIONS
    // ==================================================

    if (
        isset($row["size_options"]) &&
        $row["size_options"] !== ""
    ) {

        $decodedSizes =
            json_decode(
                $row["size_options"],
                true
            );


        if (json_last_error() === JSON_ERROR_NONE) {

            $row["size_options"] =
                $decodedSizes;

        } else {

            $row["size_options"] = [];

        }

    } else {

        $row["size_options"] = [];

    }


    // ==================================================
    // OTHER IMAGES
    // ==================================================

    if (
        isset($row["other_images"]) &&
        $row["other_images"] !== ""
    ) {

        $decodedOtherImages =
            json_decode(
                $row["other_images"],
                true
            );


        if (json_last_error() === JSON_ERROR_NONE) {

            $row["other_images"] =
                $decodedOtherImages;

        }

    }


    // ==================================================
    // ADD PRODUCT
    // ==================================================

    $products[] = $row;

}


// ======================================================
// TOTAL PRODUCT COUNT
// ======================================================

$countSql = "
    SELECT COUNT(*) AS total
    FROM products
";


$countParams = null;


if ($category_id !== null && $category_id > 0) {

    $countSql .= "
        WHERE category_id = ?
    ";

}


$countStmt =
    $conn->prepare($countSql);


$totalCount = count($products);


if ($countStmt) {

    if (
        $category_id !== null &&
        $category_id > 0
    ) {

        $countStmt->bind_param(
            "i",
            $category_id
        );

    }


    if ($countStmt->execute()) {

        $countResult =
            $countStmt->get_result();


        if ($countResult) {

            $countRow =
                $countResult->fetch_assoc();


            $totalCount =
                (int) ($countRow["total"] ?? count($products));

        }

    }


    $countStmt->close();
}


// ======================================================
// SUCCESS RESPONSE
// ======================================================

http_response_code(200);


echo json_encode(
    [
        "success" => true,
        "message" => "Products fetched successfully.",
        "data" => $products,

        // Current page result count
        "count" => count($products),

        // Total database product count
        "total_count" => $totalCount
    ],
    JSON_UNESCAPED_UNICODE |
    JSON_UNESCAPED_SLASHES
);


// ======================================================
// CLOSE
// ======================================================

$stmt->close();

$conn->close();

exit;

?>