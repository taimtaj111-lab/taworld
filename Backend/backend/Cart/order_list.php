<?php
// D:\xampp\htdocs\project2\backend\Cart\order_list.php
include("../config/connect.php");

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// ⭐ service_charge এবং delivery_location কলামসহ ডাটা ফেচ
$sql = "
    SELECT 
        id, customer_name, customer_email, phone, address, city, 
        postal_code, total_amount, delivery_charge, service_charge, 
        payment_method, payment_status, order_status, note, created_at, 
        delivery_location 
    FROM orders 
    ORDER BY id DESC
";

$result = $conn->query($sql);
$orders = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        
        $order_id = (int)$row["id"];

        // Order items load
        $itemsRes = $conn->query("
            SELECT id, product_id, product_name, quantity, price 
            FROM order_items 
            WHERE order_id = $order_id
        ");

        $items = $itemsRes ? $itemsRes->fetch_all(MYSQLI_ASSOC) : [];

        // Subtotal হিসাব
        $items_total = 0.0;
        foreach ($items as $it) {
            $items_total += floatval($it['price']) * intval($it['quantity']);
        }

        $delivery = floatval($row['delivery_charge'] ?? 0);
        $service  = floatval($row['service_charge'] ?? 0); // নতুন কলাম

        // মোট মূল্য
        $total_price = $items_total + $delivery + $service;

        // প্রাপ্ত ডাটায় অ্যাড করা
        $row['items'] = $items;
        $row['subtotal'] = number_format($items_total, 2, '.', '');
        $row['delivery_charge'] = number_format($delivery, 2, '.', '');
        $row['service_charge'] = number_format($service, 2, '.', '');
        $row['total_amount'] = number_format($total_price, 2, '.', '');

        $orders[] = $row;
    }
}

echo json_encode($orders);
?>
