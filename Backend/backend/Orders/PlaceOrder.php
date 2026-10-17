<?php
declare(strict_types=1);

/*
 * TajWorld - PlaceOrder.php
 * Existing connect.php remains unchanged.
 */

ini_set("display_errors", "0");
error_reporting(E_ALL);

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate");

$allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "https://tajworld.vercel.app",
];

$origin = $_SERVER["HTTP_ORIGIN"] ?? "";
$method = $_SERVER["REQUEST_METHOD"] ?? "";

if ($origin !== "" && !in_array($origin, $allowedOrigins, true)) {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "message" => "Origin not allowed."
    ]);
    exit;
}

if ($origin !== "") {
    header("Access-Control-Allow-Origin: " . $origin);
    header("Vary: Origin");
    header("Access-Control-Allow-Credentials: true");
}

header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");

if ($method === "OPTIONS") {
    http_response_code(204);
    exit;
}

function respond(bool $success, array $data = [], int $status = 200)
{
    http_response_code($status);

    echo json_encode(
        array_merge(["success" => $success], $data),
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES |
        JSON_INVALID_UTF8_SUBSTITUTE
    );
    exit;
}

function cleanValue($value, int $max = 255): string
{
    if (!is_string($value) && !is_numeric($value)) {
        return "";
    }

    $value = trim((string)$value);

    if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $value)) {
        return "";
    }

    return mb_strlen($value, "UTF-8") <= $max ? $value : "";
}

function failRequest(string $message, int $status = 422)
{
    throw new RuntimeException($message, $status);
}

if ($method !== "POST") {
    respond(false, [
        "message" => "Only POST requests are allowed."
    ], 405);
}

$conn = null;
$transactionStarted = false;

try {
    require_once __DIR__ . "/../config/connect.php";

    // Override connect.php's wildcard CORS header for this endpoint.
    header_remove("Access-Control-Allow-Origin");

    if ($origin !== "") {
        header("Access-Control-Allow-Origin: " . $origin);
        header("Vary: Origin");
        header("Access-Control-Allow-Credentials: true");
    }

    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new RuntimeException("Database connection unavailable.");
    }

    $raw = file_get_contents("php://input");

    if ($raw === false || strlen($raw) > 100000) {
        failRequest("Invalid request body.", 400);
    }

    $data = json_decode($raw, true);

    if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
        failRequest("Invalid JSON request.", 400);
    }

    $customer = $data["customer"] ?? null;
    $items = $data["items"] ?? null;
    $serviceRequested = $data["service_charge_requested"] ?? false;

    if (
        !is_array($customer) ||
        !is_array($items) ||
        count($items) < 1
    ) {
        failRequest("Customer details or cart is invalid.");
    }

    if (count($items) > 100) {
        failRequest("Too many products in cart.");
    }

    // ---------- Customer validation ----------
    $name = cleanValue($customer["name"] ?? "", 100);
    $email = cleanValue($customer["email"] ?? "", 190);
    $phone = cleanValue($customer["phone"] ?? "", 30);
    $address = cleanValue($customer["address"] ?? "", 500);
    $city = cleanValue($customer["city"] ?? "", 100);
    $postalCode = cleanValue($customer["postal_code"] ?? "", 30);
    $note = cleanValue($customer["note"] ?? "", 1000);

    if (
        mb_strlen($name, "UTF-8") < 2 ||
        !filter_var($email, FILTER_VALIDATE_EMAIL) ||
        !preg_match('/^[0-9+\-\s().]{7,30}$/', $phone) ||
        mb_strlen($address, "UTF-8") < 5 ||
        $city === ""
    ) {
        failRequest("Enter a valid name, email, phone, address and city.");
    }

    // ---------- Payment method ----------
    $paymentMethod = cleanValue($customer["payment_method"] ?? "", 20);
    $allowedPayments = ["COD", "bKash", "Nagad", "Bank"];

    if (!in_array($paymentMethod, $allowedPayments, true)) {
        failRequest("Please select a valid payment method.");
    }

    // ---------- Delivery & service charge (server side) ----------
    $deliveryType = cleanValue($customer["delivery_type"] ?? "", 30);

    if (!in_array($deliveryType, ["Dhaka", "Outside Dhaka"], true)) {
        failRequest("Please select a valid delivery location.");
    }

    $deliveryCharge = $deliveryType === "Dhaka" ? 60.00 : 120.00;

    if (!in_array($serviceRequested, [true, false, 0, 1, "0", "1"], true)) {
        failRequest("Invalid service charge selection.");
    }

    $serviceCharge = in_array($serviceRequested, [true, 1, "1"], true)
        ? 50.00
        : 0.00;

    // ---------- Payment details ----------
    $senderNumber = cleanValue($customer["payment_sender_number"] ?? "", 50);
    $bankName = cleanValue($customer["payment_bank_name"] ?? "", 100);
    $paymentReference = cleanValue($customer["payment_reference"] ?? "", 100);
    $paymentTimeRaw = cleanValue($customer["payment_time"] ?? "", 50);

    $paymentTimestamp = null;

    if ($paymentMethod !== "COD") {
        if (mb_strlen($senderNumber, "UTF-8") < 4) {
            failRequest(
                $paymentMethod === "Bank"
                    ? "Please enter your sender account number."
                    : "Please enter your {$paymentMethod} number."
            );
        }

        if (mb_strlen($paymentReference, "UTF-8") < 3) {
            failRequest("Please enter the transaction ID / reference.");
        }

        if ($paymentMethod === "Bank" && $bankName === "") {
            failRequest("Please enter your bank name.");
        }

        if ($paymentMethod !== "Bank") {
            $bankName = "";
        }

        if (mb_strlen($paymentTimeRaw, "UTF-8") < 3) {
            failRequest("Please enter the payment time.");
        }

        // Manual text time: parse if possible, otherwise DB column stays NULL
        $parsed = strtotime($paymentTimeRaw);
        $paymentTimestamp = $parsed !== false ? $parsed : null;
    } else {
        $senderNumber = "";
        $bankName = "";
        $paymentReference = "";
        $paymentTimeRaw = "";
    }

    // ---------- Transaction ----------
    $conn->begin_transaction();
    $transactionStarted = true;

    $productStmt = $conn->prepare("
        SELECT
            id,
            product_name,
            regular_price,
            discount_price,
            stock,
            size_options
        FROM products
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
    ");

    $validatedItems = [];
    $subtotal = 0.00;

    foreach ($items as $cartItem) {
        if (!is_array($cartItem)) {
            failRequest("Invalid cart item.");
        }

        $productId = filter_var(
            $cartItem["id"] ?? $cartItem["product_id"] ?? null,
            FILTER_VALIDATE_INT
        );

        $quantity = filter_var(
            $cartItem["quantity"] ?? null,
            FILTER_VALIDATE_INT
        );

        $selectedSize = cleanValue(
            $cartItem["selectedSize"] ?? $cartItem["selected_size"] ?? "",
            30
        );

        if ($productId === false || $productId <= 0) {
            failRequest("Invalid product ID in cart.");
        }

        if ($quantity === false || $quantity < 1 || $quantity > 100) {
            failRequest("Invalid product quantity.");
        }

        $productStmt->bind_param("i", $productId);
        $productStmt->execute();

        $product = $productStmt->get_result()->fetch_assoc();

        if (!$product) {
            failRequest("A product in your cart no longer exists.");
        }

        $stock = (int)$product["stock"];

        if ($stock < $quantity) {
            failRequest("Insufficient stock for " . $product["product_name"]);
        }

        $regularPrice = (float)$product["regular_price"];
        $discountPrice = (float)($product["discount_price"] ?? 0);

        $actualPrice = (
            $discountPrice > 0 && $discountPrice < $regularPrice
        ) ? $discountPrice : $regularPrice;

        if (!is_finite($actualPrice) || $actualPrice <= 0) {
            failRequest("Invalid price for " . $product["product_name"]);
        }

        // Validate selected size when valid JSON size options exist
        $sizeRaw = trim((string)($product["size_options"] ?? ""));

        if ($selectedSize !== "" && $sizeRaw !== "") {
            $sizes = json_decode($sizeRaw, true);

            if (is_array($sizes)) {
                $allowedSize = false;

                foreach ($sizes as $key => $value) {
                    if (is_string($value) && trim($value) === $selectedSize) {
                        $allowedSize = true;
                        break;
                    }

                    if (
                        (string)$key === $selectedSize &&
                        in_array($value, [true, 1, "1"], true)
                    ) {
                        $allowedSize = true;
                        break;
                    }
                }

                if (!$allowedSize) {
                    failRequest(
                        "Selected size is unavailable for " .
                        $product["product_name"]
                    );
                }
            }
        }

        $lineTotal = $actualPrice * $quantity;

        if (!is_finite($lineTotal) || $lineTotal <= 0) {
            failRequest("Invalid product total.");
        }

        $subtotal = round($subtotal + $lineTotal, 2);

        $validatedItems[] = [
            "product_id" => (int)$product["id"],
            "product_name" => cleanValue($product["product_name"], 255),
            "quantity" => $quantity,
            "selected_size" => $selectedSize,
            "price" => $actualPrice
        ];
    }

    $productStmt->close();

    $totalPrice = round($subtotal + $deliveryCharge + $serviceCharge, 2);

    // Payment amount is always the server-calculated total (COD = 0)
    $paymentAmount = $paymentMethod === "COD" ? 0.00 : $totalPrice;

    // Keep the customer-typed payment time in the note as well
    if ($paymentMethod !== "COD" && $paymentTimeRaw !== "") {
        $note = trim(
            $note .
            ($note !== "" ? "\n" : "") .
            "Payment time (entered by customer): " . $paymentTimeRaw
        );
    }

    // ---------- Customer token cookie ----------
    $cookieName = "project2_customer_token";
    $customerToken = $_COOKIE[$cookieName] ?? "";

    if (
        !is_string($customerToken) ||
        !preg_match('/^[a-f0-9]{64}$/', $customerToken)
    ) {
        $customerToken = bin2hex(random_bytes(32));
    }

    $customerTokenHash = hash("sha256", $customerToken);

    $isHttps = (
        (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off") ||
        (($_SERVER["HTTP_X_FORWARDED_PROTO"] ?? "") === "https")
    );

    setcookie($cookieName, $customerToken, [
        "expires" => time() + (86400 * 365),
        "path" => "/",
        "secure" => $isHttps,
        "httponly" => true,
        "samesite" => "Lax"
    ]);

    $paymentStatus = "Pending";
    $orderStatus = "Pending";

    $databasePaymentTime = $paymentTimestamp !== null
        ? date("Y-m-d H:i:s", $paymentTimestamp)
        : null;

    // ---------- Insert order ----------
    $stmtOrder = $conn->prepare("
        INSERT INTO orders (
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
            payment_transaction_id,
            payment_time,
            payment_amount,
            customer_token_hash,
            payment_status,
            order_status,
            note,
            total_price
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    ");

    $stmtOrder->bind_param(
        "sssssssdddssssssdssssd",
        $name,
        $email,
        $phone,
        $address,
        $city,
        $postalCode,
        $deliveryType,
        $subtotal,
        $deliveryCharge,
        $serviceCharge,
        $paymentMethod,
        $paymentReference,
        $senderNumber,
        $bankName,
        $paymentReference,
        $databasePaymentTime,
        $paymentAmount,
        $customerTokenHash,
        $paymentStatus,
        $orderStatus,
        $note,
        $totalPrice
    );

    $stmtOrder->execute();
    $orderId = (int)$conn->insert_id;
    $stmtOrder->close();

    if ($orderId <= 0) {
        throw new RuntimeException("Failed to create order.");
    }

    // ---------- Order items + stock ----------
    $stmtItem = $conn->prepare("
        INSERT INTO order_items (
            order_id,
            product_id,
            product_name,
            quantity,
            selected_size,
            price
        ) VALUES (?, ?, ?, ?, ?, ?)
    ");

    $stmtStock = $conn->prepare("
        UPDATE products
        SET stock = stock - ?
        WHERE id = ? AND stock >= ?
    ");

    foreach ($validatedItems as $item) {
        $itemProductId = $item["product_id"];
        $itemProductName = $item["product_name"];
        $itemQuantity = $item["quantity"];
        $itemSize = $item["selected_size"];
        $itemPrice = $item["price"];

        $stmtItem->bind_param(
            "iisisd",
            $orderId,
            $itemProductId,
            $itemProductName,
            $itemQuantity,
            $itemSize,
            $itemPrice
        );

        $stmtItem->execute();

        $stmtStock->bind_param(
            "iii",
            $itemQuantity,
            $itemProductId,
            $itemQuantity
        );

        $stmtStock->execute();

        if ($stmtStock->affected_rows !== 1) {
            failRequest("Stock changed. Please try again.");
        }
    }

    $stmtItem->close();
    $stmtStock->close();

    $conn->commit();
    $transactionStarted = false;

    respond(true, [
        "message" => "Order placed successfully.",
        "order_id" => $orderId,
        "subtotal" => $subtotal,
        "delivery_charge" => $deliveryCharge,
        "service_charge" => $serviceCharge,
        "total_price" => $totalPrice,
        "payment_method" => $paymentMethod,
        "payment_status" => $paymentStatus,
        "order_status" => $orderStatus
    ], 201);

} catch (Throwable $e) {
    if ($transactionStarted && $conn instanceof mysqli) {
        try {
            $conn->rollback();
        } catch (Throwable $ignored) {
            // Preserve the original error.
        }
    }

    error_log(
        "[PlaceOrder] " . date("Y-m-d H:i:s") . " | " . $e->getMessage()
    );

    $status = (
        $e instanceof RuntimeException &&
        $e->getCode() >= 400 &&
        $e->getCode() <= 599
    ) ? $e->getCode() : 500;

    $publicMessage = $status < 500
        ? $e->getMessage()
        : "Unable to place order. Check your information and try again.";

    respond(false, [
        "message" => $publicMessage
    ], $status);
}