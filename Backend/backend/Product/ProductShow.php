<?php

// ======================================================
// PRODUCT SHOW API
// ======================================================

// Error display বন্ধ রাখা
error_reporting(0);
ini_set("display_errors", "0");


// ======================================================
// JSON HEADER
// ======================================================

header(
    "Content-Type: application/json; charset=UTF-8"
);


// ======================================================
// CORS
// ======================================================

header(
    "Access-Control-Allow-Origin: http://localhost:5173"
);

header(
    "Access-Control-Allow-Methods: GET, OPTIONS"
);

header(
    "Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With"
);


// ======================================================
// OPTIONS REQUEST
// ======================================================

if (
    $_SERVER["REQUEST_METHOD"] === "OPTIONS"
) {

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

if (
    $_SERVER["REQUEST_METHOD"] !== "GET"
) {

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


if (
    !isset($conn) ||
    !$conn ||
    $conn->connect_error
) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Database connection failed."
    ]);

    exit;
}


// ======================================================
// CATEGORY SLUG
// ======================================================

$category_slug =
    isset($_GET["category"])
        ? trim($_GET["category"])
        : "";


// ======================================================
// SQL QUERY
// ======================================================

$sql = "
    SELECT
        p.id,
        p.product_name,
        p.regular_price,
        p.discount_price,
        p.main_image,
        p.other_images,
        p.stock,
        p.category_id,
        p.subcategory_id,
        p.size_options

    FROM products p
";


// ======================================================
// PARAMETERS
// ======================================================

$bind_types = "";

$bind_params = [];


// ======================================================
// CATEGORY FILTER
// ======================================================

if (
    $category_slug !== ""
) {

    $sql .= "
        LEFT JOIN categories c
            ON p.category_id = c.id

        LEFT JOIN subcategories s
            ON p.subcategory_id = s.id

        WHERE c.slug = ?
        OR s.slug = ?
    ";

    $bind_types = "ss";

    $bind_params = [
        $category_slug,
        $category_slug
    ];
}


// ======================================================
// ORDER
// ======================================================

$sql .= "
    ORDER BY p.id DESC
";


// ======================================================
// PREPARE
// ======================================================

$stmt =
    $conn->prepare($sql);


if (!$stmt) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" =>
            "SQL prepare failed: " .
            $conn->error
    ]);

    $conn->close();

    exit;
}


// ======================================================
// BIND PARAMETERS
// ======================================================

if (
    $category_slug !== ""
) {

    $stmt->bind_param(
        $bind_types,
        ...$bind_params
    );
}


// ======================================================
// EXECUTE
// ======================================================

if (
    !$stmt->execute()
) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" =>
            "SQL execute failed: " .
            $stmt->error
    ]);

    $stmt->close();

    $conn->close();

    exit;
}


// ======================================================
// GET RESULT
// ======================================================

$result =
    $stmt->get_result();


// ======================================================
// PRODUCTS ARRAY
// ======================================================

$products = [];


// ======================================================
// LOCAL IMAGE BASE URL
// ======================================================

$LOCAL_UPLOAD_URL =
    "http://localhost/project2/uploads/";


// ======================================================
// FETCH PRODUCTS
// ======================================================

while (
    $row = $result->fetch_assoc()
) {


    // ==================================================
    // ID
    // ==================================================

    $row["id"] =
        (int) (
            $row["id"] ?? 0
        );


    // ==================================================
    // PRICE
    // ==================================================

    $row["regular_price"] =
        (float) (
            $row["regular_price"] ?? 0
        );


    $row["discount_price"] =
        (float) (
            $row["discount_price"] ?? 0
        );


    // ==================================================
    // STOCK
    // ==================================================

    $row["stock"] =
        (int) (
            $row["stock"] ?? 0
        );


    // ==================================================
    // MAIN IMAGE
    // ==================================================

    $mainImage =
        trim(
            $row["main_image"] ?? ""
        );


    $imageUrl = "";


    if (
        $mainImage !== ""
    ) {


        // ------------------------------------------------
        // CASE 1
        // Full HTTP/HTTPS URL
        // ------------------------------------------------

        if (
            strpos(
                $mainImage,
                "http://"
            ) === 0 ||

            strpos(
                $mainImage,
                "https://"
            ) === 0
        ) {

            $imageUrl =
                $mainImage;

        }


        // ------------------------------------------------
        // CASE 2
        // /uploads/filename.jpg
        // ------------------------------------------------

        elseif (
            strpos(
                $mainImage,
                "/uploads/"
            ) === 0
        ) {

            $imageUrl =
                "http://localhost/project2" .
                $mainImage;

        }


        // ------------------------------------------------
        // CASE 3
        // uploads/filename.jpg
        // ------------------------------------------------

        elseif (
            strpos(
                $mainImage,
                "uploads/"
            ) === 0
        ) {

            $imageUrl =
                "http://localhost/project2/" .
                $mainImage;

        }


        // ------------------------------------------------
        // CASE 4
        // project2/uploads/filename.jpg
        // ------------------------------------------------

        elseif (
            strpos(
                $mainImage,
                "project2/uploads/"
            ) !== false
        ) {

            $imageUrl =
                "http://localhost/" .
                ltrim(
                    $mainImage,
                    "/"
                );

        }


        // ------------------------------------------------
        // CASE 5
        // Unsplash photo
        //
        // photo-123456...
        // ------------------------------------------------

        elseif (
            strpos(
                $mainImage,
                "photo-"
            ) === 0
        ) {

            $imageUrl =
                "https://images.unsplash.com/" .
                $mainImage;

        }


        // ------------------------------------------------
        // CASE 6
        // Filename only
        //
        // prod_123.jpg
        // ------------------------------------------------

        else {

            $imageUrl =
                $LOCAL_UPLOAD_URL .
                basename(
                    $mainImage
                );

        }

    }


    // ==================================================
    // MAIN IMAGE
    // ==================================================

    $row["main_image"] =
        $imageUrl;


    // Extra image URL
    $row["main_image_url"] =
        $imageUrl;


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


        if (
            json_last_error() === JSON_ERROR_NONE &&
            is_array($decodedSizes)
        ) {

            $row["size_options"] =
                $decodedSizes;

        } else {

            $row["size_options"] = [
                "M",
                "L",
                "XL"
            ];

        }

    } else {

        $row["size_options"] = [
            "M",
            "L",
            "XL"
        ];

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


        if (
            json_last_error() === JSON_ERROR_NONE &&
            is_array(
                $decodedOtherImages
            )
        ) {

            $row["other_images"] =
                $decodedOtherImages;

        } else {

            $row["other_images"] = [];

        }

    } else {

        $row["other_images"] = [];

    }


    // ==================================================
    // ADD PRODUCT
    // ==================================================

    $products[] =
        $row;

}


// ======================================================
// RESPONSE
// ======================================================

http_response_code(200);


echo json_encode(
    $products,
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