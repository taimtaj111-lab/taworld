<?php
include("../config/connect.php");

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight request (for CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
  echo json_encode(["success" => false, "error" => "Invalid JSON data"]);
  exit;
}

// ✅ Collect data safely
$name           = trim($data["name"] ?? "");
$email          = trim($data["email"] ?? "");
$phone          = trim($data["phone"] ?? "");
$address        = trim($data["address"] ?? "");
$city           = trim($data["city"] ?? "");
$postal_code    = trim($data["postal_code"] ?? "");
$payment_method = trim($data["payment_method"] ?? "COD");
$total_amount   = floatval($data["total_amount"] ?? 0);
$delivery_charge= floatval($data["delivery_charge"] ?? 0);
$note           = trim($data["note"] ?? "");
$items          = $data["items"] ?? [];

// ✅ Basic validation
if (empty($name) || empty($phone) || empty($address) || empty($items)) {
  echo json_encode(["success" => false, "error" => "Required fields missing"]);
  exit;
}

// ✅ Start transaction
$conn->begin_transaction();

try {
  // Insert order
  $stmt = $conn->prepare("
    INSERT INTO orders 
    (customer_name, customer_email, phone, address, city, postal_code, total_amount, delivery_charge, payment_method, payment_status, order_status, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'Pending', ?)
  ");
  $stmt->bind_param("ssssssddss", 
    $name, $email, $phone, $address, $city, $postal_code, 
    $total_amount, $delivery_charge, $payment_method, $note
  );
  
  if (!$stmt->execute()) throw new Exception("Order insert failed: " . $stmt->error);

  $order_id = $conn->insert_id;

  // Insert each order item
  $item_stmt = $conn->prepare("
    INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
    VALUES (?, ?, ?, ?, ?)
  ");

  foreach ($items as $item) {
    $pid   = intval($item["product_id"] ?? 0);
    $pname = trim($item["product_name"] ?? "");
    $qty   = intval($item["quantity"] ?? 1);
    $price = floatval($item["price"] ?? 0);

    $item_stmt->bind_param("iisid", $order_id, $pid, $pname, $qty, $price);
    if (!$item_stmt->execute()) throw new Exception("Item insert failed: " . $item_stmt->error);
  }

  $conn->commit();

  echo json_encode([
    "success" => true,
    "order_id" => $order_id,
    "message" => "Order placed successfully"
  ]);

} catch (Exception $e) {
  $conn->rollback();
  echo json_encode([
    "success" => false,
    "error" => $e->getMessage()
  ]);
}
?>
