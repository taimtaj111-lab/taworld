<?php
declare(strict_types=1);

/*
 * Order statistics endpoint for the existing project2_db database.
 * connect.php remains unchanged.
 */
header("Content-Type: application/json; charset=UTF-8");

$allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
];
$origin = $_SERVER["HTTP_ORIGIN"] ?? "";

if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: " . $origin);
    header("Access-Control-Allow-Credentials: true");
}
header("Vary: Origin");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");
header("Cache-Control: no-store");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
    exit;
}

require_once "../config/connect.php";
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: " . $origin);
    header("Access-Control-Allow-Credentials: true");
}

try {
    /*
     * total_price contains subtotal + delivery + service charge in PlaceOrder.php.
     * Cancelled orders are excluded from sales and active-order count.
     */
    $sql = "
        SELECT
            COUNT(*) AS total_orders,
            COALESCE(SUM(
                CASE
                    WHEN LOWER(COALESCE(order_status, '')) <> 'cancelled'
                    THEN COALESCE(total_price, total_amount, 0)
                    ELSE 0
                END
            ), 0) AS total_sales,
            COALESCE(SUM(
                CASE
                    WHEN LOWER(COALESCE(order_status, '')) NOT IN ('cancelled', 'delivered', 'completed')
                    THEN 1 ELSE 0
                END
            ), 0) AS active_orders
        FROM orders
    ";
    $result = $conn->query($sql);
    $row = $result->fetch_assoc();

    echo json_encode([
        "success" => true,
        "total_orders" => (int)($row["total_orders"] ?? 0),
        "total_sales" => (float)($row["total_sales"] ?? 0),
        "active_orders" => (int)($row["active_orders"] ?? 0),
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
} catch (Throwable $e) {
    error_log("[order_statistics] " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Unable to load order statistics."
    ], JSON_UNESCAPED_UNICODE);
}
