<?php
// D:\xampp\htdocs\project2\backend\Cart\delete_order.php
include("../config/connect.php");

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

// Request Body থেকে ডাটা নেওয়া
$data = json_decode(file_get_contents("php://input"), true);
$id = intval($data["id"] ?? 0);

if ($id <= 0) {
    echo json_encode(["success" => false, "error" => "Invalid Order ID"]);
    exit;
}

// ট্রান্স্যাকশন শুরু
$conn->begin_transaction();

try {
    // Step 1: order_items থেকে order সম্পর্কিত সমস্ত items delete
    $stmt_items = $conn->prepare("DELETE FROM order_items WHERE order_id=?");
    $stmt_items->bind_param("i", $id);
    if (!$stmt_items->execute()) {
        throw new Exception("Error deleting order items.");
    }

    // Step 2: orders টেবিল থেকে order delete
    $stmt_order = $conn->prepare("DELETE FROM orders WHERE id=?");
    $stmt_order->bind_param("i", $id);
    if (!$stmt_order->execute()) {
        throw new Exception("Error deleting order.");
    }

    // সফল হলে স্থায়ী commit
    $conn->commit();

    echo json_encode([
        "success" => true,
        "message" => "Order and items deleted successfully"
    ]);

} catch (Exception $e) {

    // ত্রুটি হলে rollback
    $conn->rollback();

    echo json_encode([
        "success" => false,
        "error" => "Deletion failed: " . $e->getMessage()
    ]);
}
?>
