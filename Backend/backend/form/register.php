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
$name = $data["name"] ?? "";
$email = $data["email"] ?? "";
$raw_password = $data["password"] ?? "";

if (empty($name) || empty($email) || empty($raw_password)) {
    echo json_encode(["success" => false, "message" => "All fields are required"]);
    exit();
}

$password = password_hash($raw_password, PASSWORD_BCRYPT);

$check = $conn->prepare("SELECT id FROM admins WHERE email=?");
$check->bind_param("s", $email);
$check->execute();
$check->store_result();

if ($check->num_rows > 0) {
    echo json_encode(["success" => false, "message" => "Email already registered"]);
    exit();
}

$stmt = $conn->prepare("INSERT INTO admins (name, email, password) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $name, $email, $password);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Registration successful"]);
} else {
    echo json_encode(["success" => false, "message" => "Registration failed"]);
}
?>