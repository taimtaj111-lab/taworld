<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include("../config/connect.php");

$data = json_decode(file_get_contents("php://input"), true);
$email = $data["email"] ?? "";
$password = $data["password"] ?? "";

if (empty($email) || empty($password)) {
    echo json_encode(["success" => false, "message" => "All fields are required"]);
    exit();
}

$stmt = $conn->prepare("SELECT * FROM admins WHERE email=?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();
    if (password_verify($password, $user["password"])) {
        echo json_encode([
            "success" => true,
            "message" => "Login successful",
            "email" => $user["email"],
            "name" => $user["name"]
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "Wrong password"]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Email not found"]);
}
?>