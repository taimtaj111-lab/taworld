<?php
include "../config/connect.php";

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// ✅ Handle preflight request
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  http_response_code(200);
  exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$cart = $data["cart"] ?? [];
$customer = $data["customer"] ?? [];

if (empty($cart)) {
  echo json_encode(["success" => false, "error" => "Cart is empty"]);
  exit;
}

// ✅ Delivery ও service charge হিসাব
$delivery_location = $customer["delivery_location"] ?? "dhaka";
$delivery_charge = ($delivery_location === "dhaka") ? 60.00 : 120.00;
$service_charge = floatval($customer["service_charge"] ?? 0);

// ✅ Total হিসাব
$total_amount = 0.00;
foreach ($cart as $item) {
  $price = floatval($item["discount_price"] ?? $item["price"]);
  $total_amount += $price * intval($item["quantity"]);
}
$total_price = $total_amount + $delivery_charge + $service_charge;

try {
  $conn->begin_transaction();

  // ✅ Orders টেবিলে ইনসার্ট
  $stmt_order = $conn->prepare("
    INSERT INTO orders 
    (customer_name, customer_email, phone, address, city, postal_code, delivery_type, delivery_charge, service_charge, total_amount, total_price, payment_method, payment_status, order_status, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'Pending', ?)
  ");

  $stmt_order->bind_param(
    "sssssssddddss",
    $customer["name"],
    $customer["email"],
    $customer["phone"],
    $customer["address"],
    $customer["city"],
    $customer["postal_code"],
    $delivery_location,
    $delivery_charge,
    $service_charge,
    $total_amount,
    $total_price,
    $customer["payment_method"],
    $customer["note"]
  );

  if (!$stmt_order->execute()) {
    throw new Exception("Order insert failed: " . $stmt_order->error);
  }

  $order_id = $conn->insert_id;
  $stmt_order->close();

  // ✅ Order items ইনসার্ট
  $stmt_item = $conn->prepare("
    INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
    VALUES (?, ?, ?, ?, ?)
  ");

  foreach ($cart as $item) {
    $stmt_item->bind_param(
      "iisid",
      $order_id,
      $item["id"],
      $item["name"],
      $item["quantity"],
      floatval($item["discount_price"] ?? $item["price"])
    );
    $stmt_item->execute();
  }

  $stmt_item->close();
  $conn->commit();

  echo json_encode([
    "success" => true,
    "order_id" => $order_id,
    "message" => "Order placed successfully!"
  ]);

} catch (Exception $e) {
  $conn->rollback();
  http_response_code(500);
  echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>
