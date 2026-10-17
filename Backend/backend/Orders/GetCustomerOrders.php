<?php

// ============================================================
// GET CUSTOMER ORDERS
//
// Security:
// - Exact CORS
// - HttpOnly customer token
// - SHA-256 token hash
// - Only same browser token can access orders
// - Prepared statement
// - No raw DB errors
// ============================================================


// ============================================================
// 1. CORS
// ============================================================

$allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174"
];

$requestOrigin = $_SERVER["HTTP_ORIGIN"] ?? "";


if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {

    if (in_array($requestOrigin, $allowedOrigins, true)) {

        header(
            "Access-Control-Allow-Origin: " .
            $requestOrigin
        );

        header(
            "Access-Control-Allow-Credentials: true"
        );

        header(
            "Access-Control-Allow-Methods: GET, OPTIONS"
        );

        header(
            "Access-Control-Allow-Headers: Content-Type"
        );

        header("Vary: Origin");
    }

    http_response_code(204);
    exit;
}


// ============================================================
// 2. ONLY GET
// ============================================================

if ($_SERVER["REQUEST_METHOD"] !== "GET") {

    header("Content-Type: application/json; charset=UTF-8");

    http_response_code(405);

    echo json_encode([
        "success" => false,
        "error" => "Method not allowed."
    ]);

    exit;
}


// ============================================================
// 3. ORIGIN CHECK
// ============================================================

if (
    $requestOrigin !== "" &&
    !in_array($requestOrigin, $allowedOrigins, true)
) {

    header("Content-Type: application/json; charset=UTF-8");

    http_response_code(403);

    echo json_encode([
        "success" => false,
        "error" => "Forbidden origin."
    ]);

    exit;
}


// ============================================================
// 4. DATABASE
// ============================================================

include "../config/connect.php";


// Remove connect.php CORS
header_remove("Access-Control-Allow-Origin");
header_remove("Access-Control-Allow-Credentials");

if ($requestOrigin !== "") {

    header(
        "Access-Control-Allow-Origin: " .
        $requestOrigin
    );
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Vary: Origin");

header("Content-Type: application/json; charset=UTF-8");

header(
    "Cache-Control: no-store, no-cache, must-revalidate, max-age=0"
);

header("Pragma: no-cache");

header(
    "X-Content-Type-Options: nosniff"
);


// ============================================================
// 5. CUSTOMER TOKEN
// ============================================================

$cookieName =
    "project2_customer_token";

$customerToken =
    $_COOKIE[$cookieName] ?? "";


if (
    !is_string($customerToken) ||
    strlen($customerToken) < 32
) {

    echo json_encode([
        "success" => true,
        "orders" => []
    ]);

    exit;
}


// ============================================================
// 6. HASH TOKEN
// ============================================================

$customerTokenHash =
    hash(
        "sha256",
        $customerToken
    );


// ============================================================
// 7. FETCH ONLY THIS BROWSER'S ORDERS
// ============================================================

try {

    $stmt =
        $conn->prepare(
            "
            SELECT
                id,
                customer_name,
                customer_email,
                phone,
                address,
                city,
                postal_code,
                delivery_type,
                total_amount,
                delivery_charge,
                service_charge,
                payment_method,
                payment_reference,
                payment_sender_number,
                payment_bank_name,
                payment_amount,
                payment_time,
                payment_status,
                order_status,
                note,
                created_at
            FROM orders
            WHERE customer_token_hash = ?
            ORDER BY id DESC
            LIMIT 100
            "
        );


    if (!$stmt) {

        throw new Exception(
            "Query preparation failed."
        );
    }


    $stmt->bind_param(
        "s",
        $customerTokenHash
    );


    if (!$stmt->execute()) {

        throw new Exception(
            "Query execution failed."
        );
    }


    $result =
        $stmt->get_result();


    $orders = [];


    // ========================================================
    // 8. MASK SENSITIVE PAYMENT NUMBER
    // ========================================================

    function maskPaymentNumber($value): string
    {
        $value =
            (string)$value;

        if ($value === "") {
            return "";
        }

        $length =
            strlen($value);

        if ($length <= 4) {

            return str_repeat(
                "*",
                $length
            );
        }

        return
            str_repeat(
                "*",
                $length - 4
            ) .
            substr(
                $value,
                -4
            );
    }


    // ========================================================
    // 9. ORDERS
    // ========================================================

    while (
        $order =
        $result->fetch_assoc()
    ) {

        $orderId =
            (int)$order["id"];


        // ----------------------------------------------------
        // Mask sender/account number
        // ----------------------------------------------------

        $order["payment_sender_number"] =
            maskPaymentNumber(
                $order["payment_sender_number"]
            );


        // ----------------------------------------------------
        // Numeric values
        // ----------------------------------------------------

        $order["id"] =
            $orderId;

        $order["total_amount"] =
            (float)$order["total_amount"];

        $order["delivery_charge"] =
            (float)$order["delivery_charge"];

        $order["service_charge"] =
            (float)$order["service_charge"];

        $order["payment_amount"] =
            $order["payment_amount"] !== null
                ? (float)$order["payment_amount"]
                : null;


        // ----------------------------------------------------
        // Get order items
        // ----------------------------------------------------

        $itemStmt =
            $conn->prepare(
                "
                SELECT
                    id,
                    product_id,
                    product_name,
                    price,
                    quantity,
                    selected_size
                FROM order_items
                WHERE order_id = ?
                ORDER BY id ASC
                "
            );


        if (!$itemStmt) {

            throw new Exception(
                "Item query preparation failed."
            );
        }


        $itemStmt->bind_param(
            "i",
            $orderId
        );


        $itemStmt->execute();


        $itemResult =
            $itemStmt->get_result();


        $items = [];


        while (
            $item =
            $itemResult->fetch_assoc()
        ) {

            $items[] = [
                "id" =>
                    (int)$item["id"],

                "product_id" =>
                    (int)$item["product_id"],

                "product_name" =>
                    $item["product_name"],

                "price" =>
                    (float)$item["price"],

                "quantity" =>
                    (int)$item["quantity"],

                "selected_size" =>
                    $item["selected_size"]
            ];
        }


        $itemStmt->close();


        $order["items"] =
            $items;


        $orders[] =
            $order;
    }


    $stmt->close();


    // ========================================================
    // 10. RESPONSE
    // ========================================================

    echo json_encode([
        "success" => true,
        "orders" => $orders
    ]);

    exit;


} catch (Throwable $e) {

    error_log(
        "GetCustomerOrders Error: " .
        $e->getMessage()
    );


    http_response_code(500);

    echo json_encode([
        "success" => false,
        "error" =>
            "Unable to load order history."
    ]);

    exit;
}