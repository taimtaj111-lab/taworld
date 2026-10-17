<?php
include("../config/connect.php");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

if(isset($data["cart"]) && count($data["cart"]) > 0){
    $cart = $data["cart"];
    echo json_encode(["success" => true, "message" => "Cart received", "cart" => $cart]);
} else {
    echo json_encode(["success" => false, "message" => "No cart data received"]);
}
?>
