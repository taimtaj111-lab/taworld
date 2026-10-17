<?php
// backend/config/cors.php
// Allowed React origins (add your live site here later)
$allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "https://tajworld.vercel.app",
];

$origin = $_SERVER["HTTP_ORIGIN"] ?? "";

if ($origin !== "" && in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: " . $origin);
    header("Access-Control-Allow-Credentials: true");
    header("Vary: Origin");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if (($_SERVER["REQUEST_METHOD"] ?? "") === "OPTIONS") {
    http_response_code(204);
    exit;
}