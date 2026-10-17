<?php
// C:\xampp\htdocs\project2\backend\config\connect.php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, DELETE, PUT, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "project2_db";

// 💡 ১০ নম্বর লাইন: mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT); 
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $conn = new mysqli($servername, $username, $password, $dbname);
    $conn->set_charset("utf8mb4");
} catch (mysqli_sql_exception $e) {
    // যদি সংযোগ ব্যর্থ হয়, তাহলে একটি JSON এরর বার্তা পাঠানো হবে
    http_response_code(500); 
    echo json_encode(["success" => false, "message" => "DB connection failed: " . $e->getMessage()]);
    exit();
}
?>