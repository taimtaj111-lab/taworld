<?php
include("../../config/connect.php");

$data = json_decode(file_get_contents("php://input"));
$id = (int)($data->id ?? 0);
$type = trim($data->type ?? ''); // 'category' or 'subcategory'

if ($id <= 0 || !in_array($type, ['category', 'subcategory'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid ID or type."]);
    $conn->close();
    exit();
}

$table = ($type === 'category') ? 'categories' : 'subcategories';
$product_link_column = ($type === 'category') ? 'category_id' : 'subcategory_id';

try {
    // 1. Check linked products
    $check_query = "SELECT COUNT(id) AS linked_products FROM products WHERE $product_link_column = ?";
    $stmt_check = $conn->prepare($check_query);
    $stmt_check->bind_param("i", $id);
    $stmt_check->execute();
    $linked_count = $stmt_check->get_result()->fetch_assoc()['linked_products'];
    $stmt_check->close();

    if ($linked_count > 0) {
        http_response_code(409);
        echo json_encode([
            "success" => false, 
            "message" => "Cannot delete this " . $type . " because " . $linked_count . " product(s) are attached to it. Remove/reassign products first."
        ]);
        $conn->close();
        exit();
    }

    // 2. Check linked subcategories if parent category
    if ($type === 'category') {
        $stmt_sub_check = $conn->prepare("SELECT COUNT(id) AS linked_subcategories FROM subcategories WHERE category_id = ?");
        $stmt_sub_check->bind_param("i", $id);
        $stmt_sub_check->execute();
        $linked_sub_count = $stmt_sub_check->get_result()->fetch_assoc()['linked_subcategories'];
        $stmt_sub_check->close();

        if ($linked_sub_count > 0) {
            http_response_code(409);
            echo json_encode([
                "success" => false, 
                "message" => "Cannot delete main category. First delete its " . $linked_sub_count . " subcategory(ies)."
            ]);
            $conn->close();
            exit();
        }
    }

    // 3. Delete item
    $stmt = $conn->prepare("DELETE FROM $table WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode(["success" => true, "message" => ucfirst($type) . " deleted successfully."]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => ucfirst($type) . " not found."]);
        }
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Database delete failed."]);
    }
    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}

$conn->close();
?>