<?php
declare(strict_types=1);

/*
 * TajWorld - OrderHistory.php
 * Works with the existing OrderHistory.jsx email + phone search.
 * connect.php is intentionally left unchanged.
 */

ini_set("display_errors", "0");
error_reporting(E_ALL);

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

$allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "https://tajworld.vercel.app"
];

$origin = $_SERVER["HTTP_ORIGIN"] ?? "";
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: " . $origin);
    header("Vary: Origin");
}
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

function sendJson(bool $success, array $data = [], int $status = 200): never {
    http_response_code($status);
    echo json_encode(
        array_merge(["success" => $success], $data),
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
    );
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    sendJson(false, ["message" => "Only POST requests are allowed."], 405);
}

try {
    require_once __DIR__ . "/../config/connect.php";

    // connect.php sets a wildcard header; replace it with the allowed frontend origin.
    header_remove("Access-Control-Allow-Origin");
    if (in_array($origin, $allowedOrigins, true)) {
        header("Access-Control-Allow-Origin: " . $origin);
        header("Vary: Origin");
    }

    $raw = file_get_contents("php://input");
    if ($raw === false || strlen($raw) > 20000) {
        sendJson(false, ["message" => "Invalid request."], 400);
    }

    $data = json_decode($raw, true);
    if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
        sendJson(false, ["message" => "Invalid JSON request."], 400);
    }

    $email = trim((string)($data["email"] ?? ""));
    $phone = trim((string)($data["phone"] ?? ""));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $phone === "" || strlen($phone) > 30) {
        sendJson(false, ["message" => "Enter the valid email and phone number used for the order."], 422);
    }

    $stmt = $conn->prepare(
        "SELECT id, customer_name, customer_email, phone, address, city, postal_code,
                delivery_type, total_amount, delivery_charge, service_charge,
                payment_method, payment_status, order_status, note, total_price, created_at
         FROM orders
         WHERE LOWER(customer_email) = LOWER(?) AND phone = ?
         ORDER BY id DESC
         LIMIT 100"
    );
    $stmt->bind_param("ss", $email, $phone);
    $stmt->execute();
    $result = $stmt->get_result();

    $orders = [];
    $itemStmt = $conn->prepare(
        "SELECT id, product_id, product_name, quantity, selected_size, price
         FROM order_items
         WHERE order_id = ?
         ORDER BY id ASC"
    );

    while ($order = $result->fetch_assoc()) {
        $orderId = (int)$order["id"];
        $itemStmt->bind_param("i", $orderId);
        $itemStmt->execute();
        $itemResult = $itemStmt->get_result();

        $items = [];
        while ($item = $itemResult->fetch_assoc()) {
            $items[] = [
                "id" => (int)$item["id"],
                "product_id" => (int)$item["product_id"],
                "product_name" => (string)$item["product_name"],
                "quantity" => (int)$item["quantity"],
                "selected_size" => (string)($item["selected_size"] ?? ""),
                "price" => (float)$item["price"]
            ];
        }

        $order["id"] = $orderId;
        $order["total_amount"] = (float)$order["total_amount"];
        $order["delivery_charge"] = (float)$order["delivery_charge"];
        $order["service_charge"] = (float)$order["service_charge"];
        $order["total_price"] = (float)($order["total_price"] ?? (
            $order["total_amount"] + $order["delivery_charge"] + $order["service_charge"]
        ));
        $order["items"] = $items;
        $orders[] = $order;
    }

    $itemStmt->close();
    $stmt->close();

    sendJson(true, ["orders" => $orders]);
} catch (Throwable $e) {
    error_log("[OrderHistory] " . date("Y-m-d H:i:s") . " | " . $e->getMessage());
    sendJson(false, ["message" => "Unable to load order history. Check the PHP error log."], 500);
}
?>
