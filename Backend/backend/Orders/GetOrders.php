<?php
declare(strict_types=1);

/*
 * One endpoint for all admin order actions:
 *   GET                       -> list orders
 *   POST action=update_order_status
 *   POST action=update_payment_status
 *   POST action=update_order  (customer info edit)
 *   POST action=delete_order
 *
 * connect.php sends the CORS headers and answers OPTIONS requests.
 */

ini_set("display_errors", "0");
error_reporting(E_ALL);

require_once __DIR__ . "/../config/connect.php";

header("Cache-Control: no-store, no-cache, must-revalidate");

const ORDER_STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
const PAYMENT_STATUSES = ["Pending", "Completed", "Failed", "Refunded"];

function jsonOut(array $payload, int $status = 200)
{
    http_response_code($status);
    echo json_encode(
        $payload,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
    );
    exit;
}

function readJsonBody(): array
{
    $raw = file_get_contents("php://input");

    if ($raw === false || strlen($raw) > 100000) {
        throw new RuntimeException("Invalid request body.", 400);
    }

    $data = json_decode($raw, true);

    if (!is_array($data)) {
        throw new RuntimeException("Invalid JSON request.", 400);
    }

    return $data;
}

function cleanText($value, int $max): string
{
    if ($value === null) {
        return "";
    }

    if (!is_string($value) && !is_numeric($value)) {
        throw new RuntimeException("Invalid input.", 422);
    }

    $value = trim((string)$value);

    if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $value)) {
        throw new RuntimeException("Invalid characters in input.", 422);
    }

    if (mb_strlen($value, "UTF-8") > $max) {
        throw new RuntimeException("Input is too long.", 422);
    }

    return $value;
}

/*
 * $direction > 0  : put order quantities back into stock
 * $direction <= 0 : take order quantities out of stock
 */
function adjustStock(mysqli $conn, int $orderId, int $direction)
{
    $itemsStmt = $conn->prepare(
        "SELECT product_id, quantity FROM order_items WHERE order_id = ?"
    );
    $itemsStmt->bind_param("i", $orderId);
    $itemsStmt->execute();
    $rows = $itemsStmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $itemsStmt->close();

    if ($direction > 0) {
        $stmt = $conn->prepare("UPDATE products SET stock = stock + ? WHERE id = ?");

        foreach ($rows as $row) {
            $qty = (int)$row["quantity"];
            $pid = (int)$row["product_id"];
            $stmt->bind_param("ii", $qty, $pid);
            $stmt->execute();
        }

        $stmt->close();
        return;
    }

    $stmt = $conn->prepare(
        "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?"
    );

    foreach ($rows as $row) {
        $qty = (int)$row["quantity"];
        $pid = (int)$row["product_id"];
        $stmt->bind_param("iii", $qty, $pid, $qty);
        $stmt->execute();

        if ($stmt->affected_rows !== 1) {
            $stmt->close();
            throw new RuntimeException("Not enough stock to re-activate this order.", 409);
        }
    }

    $stmt->close();
}

function orderExists(mysqli $conn, int $id): bool
{
    $stmt = $conn->prepare("SELECT id FROM orders WHERE id = ? LIMIT 1");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return (bool)$row;
}

/* ---------------- LIST ---------------- */

function listOrders(mysqli $conn)
{
    $result = $conn->query("SELECT * FROM orders ORDER BY id DESC");

    $itemStmt = $conn->prepare("
        SELECT id, product_id, product_name, quantity, selected_size, price
        FROM order_items
        WHERE order_id = ?
        ORDER BY id ASC
    ");

    $orders = [];

    while ($order = $result->fetch_assoc()) {
        $orderId = (int)$order["id"];

        $itemStmt->bind_param("i", $orderId);
        $itemStmt->execute();
        $items = $itemStmt->get_result()->fetch_all(MYSQLI_ASSOC);

        $itemsTotal = 0.0;
        foreach ($items as $it) {
            $itemsTotal += (float)$it["price"] * (int)$it["quantity"];
        }

        $delivery = (float)($order["delivery_charge"] ?? 0);
        $service = (float)($order["service_charge"] ?? 0);
        $totalPrice = (float)($order["total_price"] ?? 0);

        if ($totalPrice <= 0) {
            $totalPrice = $itemsTotal + $delivery + $service;
        }

        // Never send the private customer token hash to the browser
        unset($order["customer_token_hash"]);

        // Payment info (always present, so the admin page can show it)
        $order["payment_method"] = (string)($order["payment_method"] ?? "COD");
        $order["payment_sender_number"] = (string)($order["payment_sender_number"] ?? "");
        $order["payment_bank_name"] = (string)($order["payment_bank_name"] ?? "");

        $reference = (string)($order["payment_reference"] ?? "");
        if ($reference === "") {
            $reference = (string)($order["payment_transaction_id"] ?? "");
        }
        $order["payment_reference"] = $reference;
        $order["payment_amount"] = number_format(
            (float)($order["payment_amount"] ?? 0),
            2,
            ".",
            ""
        );

        $order["items"] = $items;
        $order["items_total"] = number_format($itemsTotal, 2, ".", "");
        $order["delivery_charge"] = number_format($delivery, 2, ".", "");
        $order["service_charge"] = number_format($service, 2, ".", "");
        $order["total_price"] = number_format($totalPrice, 2, ".", "");

        $orders[] = $order;
    }

    $itemStmt->close();

    http_response_code(200);
    echo json_encode(
        $orders,
        JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
    );
    exit;
}

/* ---------------- ACTIONS ---------------- */

function actionUpdateOrderStatus(mysqli $conn, array $data)
{
    $id = filter_var($data["id"] ?? null, FILTER_VALIDATE_INT);
    $newStatus = trim((string)($data["status"] ?? ""));

    if ($id === false || $id <= 0 || !in_array($newStatus, ORDER_STATUSES, true)) {
        throw new RuntimeException("Invalid order ID or status.", 422);
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("SELECT order_status FROM orders WHERE id = ? FOR UPDATE");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$row) {
            throw new RuntimeException("Order not found.", 404);
        }

        $oldStatus = (string)$row["order_status"];

        if ($oldStatus !== $newStatus) {
            $wasCancelled = strcasecmp($oldStatus, "Cancelled") === 0;
            $willCancel = $newStatus === "Cancelled";

            if (!$wasCancelled && $willCancel) {
                adjustStock($conn, $id, 1);   // cancelled -> stock comes back
            } elseif ($wasCancelled && !$willCancel) {
                adjustStock($conn, $id, -1);  // re-activated -> stock goes out again
            }

            $update = $conn->prepare("UPDATE orders SET order_status = ? WHERE id = ?");
            $update->bind_param("si", $newStatus, $id);
            $update->execute();
            $update->close();
        }

        $conn->commit();
    } catch (Throwable $e) {
        try {
            $conn->rollback();
        } catch (Throwable $ignored) {
        }
        throw $e;
    }

    jsonOut([
        "success" => true,
        "message" => "Order status updated.",
        "order_status" => $newStatus
    ]);
}

function actionUpdatePaymentStatus(mysqli $conn, array $data)
{
    $id = filter_var($data["id"] ?? null, FILTER_VALIDATE_INT);
    $paymentStatus = trim((string)($data["payment_status"] ?? ""));

    if (
        $id === false ||
        $id <= 0 ||
        !in_array($paymentStatus, PAYMENT_STATUSES, true)
    ) {
        throw new RuntimeException("Invalid order ID or payment status.", 422);
    }

    if (!orderExists($conn, $id)) {
        throw new RuntimeException("Order not found.", 404);
    }

    $stmt = $conn->prepare("UPDATE orders SET payment_status = ? WHERE id = ?");
    $stmt->bind_param("si", $paymentStatus, $id);
    $stmt->execute();
    $stmt->close();

    jsonOut([
        "success" => true,
        "message" => "Payment status updated.",
        "payment_status" => $paymentStatus
    ]);
}

function actionUpdateOrder(mysqli $conn, array $data)
{
    $id = filter_var($data["id"] ?? null, FILTER_VALIDATE_INT);

    if ($id === false || $id <= 0) {
        throw new RuntimeException("Invalid order ID.", 422);
    }

    $name = cleanText($data["customer_name"] ?? "", 100);
    $email = cleanText($data["customer_email"] ?? "", 190);
    $phone = cleanText($data["phone"] ?? "", 30);
    $address = cleanText($data["address"] ?? "", 500);
    $city = cleanText($data["city"] ?? "", 100);
    $postalCode = cleanText($data["postal_code"] ?? "", 30);
    $note = cleanText($data["note"] ?? "", 1000);

    if (
        mb_strlen($name, "UTF-8") < 2 ||
        !filter_var($email, FILTER_VALIDATE_EMAIL) ||
        !preg_match('/^[0-9+\-\s().]{7,30}$/', $phone) ||
        mb_strlen($address, "UTF-8") < 5 ||
        $city === ""
    ) {
        throw new RuntimeException(
            "Enter a valid name, email, phone, address and city.",
            422
        );
    }

    if (!orderExists($conn, $id)) {
        throw new RuntimeException("Order not found.", 404);
    }

    $stmt = $conn->prepare("
        UPDATE orders
        SET customer_name = ?,
            customer_email = ?,
            phone = ?,
            address = ?,
            city = ?,
            postal_code = ?,
            note = ?
        WHERE id = ?
    ");

    $stmt->bind_param(
        "sssssssi",
        $name,
        $email,
        $phone,
        $address,
        $city,
        $postalCode,
        $note,
        $id
    );

    $stmt->execute();
    $stmt->close();

    jsonOut(["success" => true, "message" => "Order updated."]);
}

function actionDeleteOrder(mysqli $conn, array $data)
{
    $id = filter_var($data["id"] ?? null, FILTER_VALIDATE_INT);

    if ($id === false || $id <= 0) {
        throw new RuntimeException("Invalid order ID.", 422);
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("SELECT order_status FROM orders WHERE id = ? FOR UPDATE");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$row) {
            throw new RuntimeException("Order not found.", 404);
        }

        // Pending / Processing orders still hold stock -> give it back
        if (in_array((string)$row["order_status"], ["Pending", "Processing"], true)) {
            adjustStock($conn, $id, 1);
        }

        $delItems = $conn->prepare("DELETE FROM order_items WHERE order_id = ?");
        $delItems->bind_param("i", $id);
        $delItems->execute();
        $delItems->close();

        $delOrder = $conn->prepare("DELETE FROM orders WHERE id = ?");
        $delOrder->bind_param("i", $id);
        $delOrder->execute();
        $deleted = $delOrder->affected_rows;
        $delOrder->close();

        if ($deleted !== 1) {
            throw new RuntimeException("Order could not be deleted.", 500);
        }

        $conn->commit();
    } catch (Throwable $e) {
        try {
            $conn->rollback();
        } catch (Throwable $ignored) {
        }
        throw $e;
    }

    jsonOut(["success" => true, "message" => "Order deleted."]);
}

/* ---------------- ROUTER ---------------- */

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new RuntimeException("Database connection unavailable.", 500);
    }

    $method = $_SERVER["REQUEST_METHOD"] ?? "";

    if ($method === "GET") {
        listOrders($conn);
    }

    if ($method !== "POST") {
        throw new RuntimeException("Method not allowed.", 405);
    }

    $data = readJsonBody();
    $action = (string)($data["action"] ?? "");

    switch ($action) {
        case "update_order_status":
            actionUpdateOrderStatus($conn, $data);
            break;

        case "update_payment_status":
            actionUpdatePaymentStatus($conn, $data);
            break;

        case "update_order":
            actionUpdateOrder($conn, $data);
            break;

        case "delete_order":
            actionDeleteOrder($conn, $data);
            break;

        default:
            throw new RuntimeException("Unknown action.", 400);
    }
} catch (Throwable $e) {
    error_log("[GetOrders] " . date("Y-m-d H:i:s") . " | " . $e->getMessage());

    $code = $e->getCode();
    $status = ($e instanceof RuntimeException && is_int($code) && $code >= 400 && $code <= 599)
        ? $code
        : 500;

    jsonOut([
        "success" => false,
        "message" => $status < 500 ? $e->getMessage() : "Server error. Please try again."
    ], $status);
}