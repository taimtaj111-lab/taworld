<?php
include("../../config/connect.php");

$data = json_decode(file_get_contents("php://input"));
$id = (int)($data->id ?? 0);
$name = trim($data->name ?? '');
$type = trim($data->type ?? ''); // 'category' or 'subcategory'

if ($id <= 0 || empty($name) || !in_array($type, ['category', 'subcategory'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid ID, name, or item type."]);
    $conn->close();
    exit();
}

$table = ($type === 'category') ? 'categories' : 'subcategories';
$column = ($type === 'category') ? 'category_name' : 'subcategory_name';

// Generate unique slug
$slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name)));
$final_slug = $slug;
$i = 1;

try {
    $stmt_check = $conn->prepare("SELECT id FROM $table WHERE slug = ? AND id != ?");
    while (true) {
        $stmt_check->bind_param("si", $final_slug, $id);
        $stmt_check->execute();
        $result_check = $stmt_check->get_result();
        
        if ($result_check->num_rows == 0) {
            break;
        }
        $final_slug = $slug . '-' . $i++;
    }
    $stmt_check->close();

    // Perform Update
    $stmt = $conn->prepare("UPDATE $table SET $column = ?, slug = ? WHERE id = ?");
    $stmt->bind_param("ssi", $name, $final_slug, $id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => ucfirst($type) . " updated successfully."]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Update failed."]);
    }
    $stmt->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error: " . $e->getMessage()]);
}

$conn->close();
?>