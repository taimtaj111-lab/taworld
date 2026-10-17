-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 17, 2026 at 07:32 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `project2_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `acc_cashbook`
--

CREATE TABLE `acc_cashbook` (
  `id` int(11) NOT NULL,
  `entry_date` date NOT NULL,
  `account` varchar(20) NOT NULL,
  `entry_type` varchar(5) NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `description` varchar(500) NOT NULL DEFAULT '',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `acc_expenses`
--

CREATE TABLE `acc_expenses` (
  `id` int(11) NOT NULL,
  `expense_date` date NOT NULL,
  `category` varchar(50) NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `note` varchar(500) NOT NULL DEFAULT '',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `acc_expenses`
--

INSERT INTO `acc_expenses` (`id`, `expense_date`, `category`, `amount`, `note`, `created_at`) VALUES
(1, '2026-10-15', 'Meta Ads', 1500.00, '', '2026-10-15 17:38:00');

-- --------------------------------------------------------

--
-- Table structure for table `acc_purchases`
--

CREATE TABLE `acc_purchases` (
  `id` int(11) NOT NULL,
  `purchase_date` date NOT NULL,
  `supplier_name` varchar(150) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_cost` decimal(12,2) NOT NULL,
  `total_cost` decimal(14,2) NOT NULL,
  `paid_amount` decimal(14,2) NOT NULL DEFAULT 0.00,
  `stock_added` tinyint(1) NOT NULL DEFAULT 0,
  `note` varchar(500) NOT NULL DEFAULT '',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `name`, `email`, `password`) VALUES
(2, 'taj', 'taj@gmail.com', '$2y$10$D/IMaXGy9K50Cg39QtB8ou9ZWd6YL6W04qjo4Cv.59TxytJhLipfW'),
(3, 'taj', 'admin@gmail.com', '$2y$10$zQkAwgafZbC1W33szOdG9OV/O0xoBpS4BQMaWi8lnRFiUzs/cMbh.');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `category_name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `category_name`, `slug`, `created_at`) VALUES
(7, 'Saree', 'saree', '2025-11-30 10:25:23'),
(8, 'Three-Piece', 'three-piece', '2025-12-02 06:00:13'),
(9, 'Womens Tops', 'womens-tops', '2025-12-02 12:02:31'),
(10, 'Womens Two-Piece', 'womens-two-piece', '2025-12-02 12:20:11'),
(11, 'Women\'s Blazer', 'women-s-blazer', '2025-12-02 12:26:29'),
(26, 'Taim', 'taim', '2026-01-20 12:11:26'),
(41, 'Fashion Accessories', 'fashion-accessories', '2026-01-26 07:24:15'),
(42, 'Watches & Jewelry', 'watches-jewelry', '2026-01-26 07:24:28'),
(44, 'Watches And Jewelry', 'watches-and-jewelry', '2026-01-26 07:31:50'),
(45, 'Bags & Travel', 'bags-travel', '2026-01-26 07:32:00'),
(46, 'Innerwear & Sleepwear', 'innerwear-sleepwear', '2026-01-26 07:32:12'),
(47, 'Activewear & Sports', 'activewear-sports', '2026-01-26 07:32:22'),
(48, 'Footwear', 'footwear', '2026-01-26 07:32:31'),
(49, 'Winter Collection', 'winter-collection', '2026-01-26 07:32:39'),
(50, 'Kids\' Fashion', 'kids-fashion', '2026-01-26 07:32:49'),
(51, 'Women\'s Fashion', 'women-s-fashion', '2026-01-26 07:32:59'),
(52, 'Men\'s Fashion', 'men-s-fashion', '2026-01-26 07:33:08'),
(53, 'tg56rey', 'tg56rey', '2026-10-02 15:46:26'),
(54, 'taimtaj111@gmail.co', 'taimtaj111-gmail-co', '2026-10-02 16:24:27'),
(55, 'tajjjjjjjjjjjjjjjjjjjjjj', 'tajjjjjjjjjjjjjjjjjjjjjj', '2026-10-12 18:43:42');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `customer_name` varchar(100) NOT NULL,
  `customer_email` varchar(190) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `address` varchar(500) NOT NULL,
  `city` varchar(100) NOT NULL,
  `postal_code` varchar(30) DEFAULT NULL,
  `delivery_type` varchar(30) NOT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `delivery_charge` decimal(12,2) NOT NULL DEFAULT 0.00,
  `service_charge` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` varchar(20) NOT NULL,
  `payment_reference` varchar(100) DEFAULT NULL,
  `payment_sender_number` varchar(50) DEFAULT NULL,
  `payment_bank_name` varchar(100) DEFAULT NULL,
  `payment_transaction_id` varchar(100) DEFAULT NULL,
  `payment_time` datetime DEFAULT NULL,
  `payment_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `customer_token_hash` char(64) DEFAULT NULL,
  `payment_status` varchar(30) NOT NULL DEFAULT 'Pending',
  `order_status` varchar(30) NOT NULL DEFAULT 'Pending',
  `note` varchar(1000) DEFAULT NULL,
  `customer_address` text DEFAULT NULL,
  `total_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(50) NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `customer_name`, `customer_email`, `phone`, `address`, `city`, `postal_code`, `delivery_type`, `total_amount`, `delivery_charge`, `service_charge`, `payment_method`, `payment_reference`, `payment_sender_number`, `payment_bank_name`, `payment_transaction_id`, `payment_time`, `payment_amount`, `customer_token_hash`, `payment_status`, `order_status`, `note`, `customer_address`, `total_price`, `status`, `created_at`) VALUES
(22, 'Taim Taj', 'taimtaj111@gmail.com', '+8801839869578', 'Mirpur, Dhaka', 'Mirpur, Dhaka, Bangladesh', '540025', 'Dhaka', 18022.00, 60.00, 0.00, 'Nagad', 'KFG5DFGJK', '8801839869578', '', 'KFG5DFGJK', NULL, 18082.00, '27b7ab2911e360143230cc1c724fa9dbdeab9e83ef20a88d12c53153eee3b110', 'Completed', 'Delivered', 'Payment time (entered by customer): 15/10/26 10:10PM', NULL, 18082.00, 'Pending', '2026-10-15 17:33:36');

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `quantity` int(11) DEFAULT 1,
  `selected_size` varchar(30) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `product_name`, `quantity`, `selected_size`, `price`) VALUES
(28, 22, 30, 'Binodini Saree', 1, 'S', 1200.00),
(29, 22, 18, 'Women\'s Beige Blazer', 1, 'S', 5500.00),
(30, 22, 17, 'Womens Navy Two Piece Set', 1, 'S', 7000.00),
(31, 22, 16, 'Womens Radish Purple Top', 1, 'S', 1222.00),
(32, 22, 15, 'Womens Off White Shirt', 1, 'S', 1500.00),
(33, 22, 14, 'Three-Piece Lawn', 1, 'S', 1600.00);

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `subcategory_id` int(11) DEFAULT NULL,
  `product_code` varchar(50) DEFAULT NULL,
  `regular_price` decimal(10,2) NOT NULL,
  `discount_price` decimal(10,2) DEFAULT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `short_description` text DEFAULT NULL,
  `full_description` text DEFAULT NULL,
  `tags` text DEFAULT NULL,
  `size_options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`size_options`)),
  `delivery_charge` decimal(10,2) DEFAULT NULL,
  `other_images` text DEFAULT NULL,
  `main_image` varchar(512) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `product_name`, `category_id`, `subcategory_id`, `product_code`, `regular_price`, `discount_price`, `stock`, `short_description`, `full_description`, `tags`, `size_options`, `delivery_charge`, `other_images`, `main_image`) VALUES
(14, ' Three-Piece Lawn', 8, 10, 'LSHR17256', 3500.00, 1600.00, 39, 'Relaxed Fit Embroidered Three-Piece Lawn', 'DELIVERY POLICY\r\n\r\n\r\nAt YELLOW, we ensure your orders are delivered as quickly as possible. After placing your order, you’ll receive a confirmation email.\r\n\r\nExpect your delivery within 5 to 8 business days anywhere in Bangladesh, with no shipping fees. However, due to the increased rush of orders, deliveries during a sale campaign may take 8–10 business days.\r\n\r\nWe start processing your order within 24 hours. If you need to cancel or change it, please contact our Customer Services Department right away at 01958227060 or customerservice@yellowclothing.net. When your order arrives, you can check the products before receiving. If there’s any issue, reach out to Customer Services Department for an immediate return.\r\n\r\nPlease note:\r\n\r\n> Partial delivery/exchange are not allowed.\r\n\r\n\r\n> No exchanges for discounted/special offer items.\r\n\r\n\r\n> Accessories items such as Boxer briefs, Tank Tops, Leggings, & Pajama are not returnable and to be paid in advance.\r\n\r\n\r\n> Monetary refunds are not available.\r\n\r\n\r\n....................................\r\nআপনার অর্ডারটি সময়মতো পৌঁছে দিতে আমরা সর্বদাই প্রতিশ্রুতিবদ্ধ। অর্ডার দেওয়ার পর, আপনি একটি কনফার্মেশন ইমেইল পাবেন। বাংলাদেশের যেকোনো স্থানে ৫ থেকে ৮ কার্যদিবসের মধ্যে আপনার অর্ডারটি সম্পূর্ণ বিনামূল্যে পৌঁছে দিতে আমরা সর্বাত্মক প্রচেষ্টা করি। তবে সেল ক্যাম্পেইন চলাকালীন সময়ে অর্ডার ডেলিভারির সময় ৮ থেকে ১০ কার্যদিবস হতে পারে। ২৪ ঘণ্টার মধ্যে আমাদের শিপিং শুরু হয়। কোনো অর্ডার বাতিল বা পরিবর্তন করতে চাইলে, দয়া করে দ্রুততম সময়ে কাস্টমার সার্ভিসে (01958227060/customerservice@yellowclothing.net) যোগাযোগ করুন। অর্ডারটি হাতে পাওয়ার পর, রিসিভ করার আগে আপনি চেক করে নিতে পারবেন। কোনো সমস্যা হলে, সাথে সাথে কাস্টমার সার্ভিসে জানান এবং রিটার্ন করুন।\r\n\r\n\r\nউল্লেখ্য:\r\n\r\n\r\n> আংশিক ডেলিভারি/পরিবর্তন গ্রহণযোগ্য নয়।\r\n\r\n\r\n> কোনো ছাড় বা বিশেষ-অফারের প্রোডাক্ট পরিবর্তনযোগ্য নয়।\r\n\r\n\r\n> এক্সেসরিজ আইটেম যেমন বক্সার ব্রিফ, ট্যাঙ্ক টপ, লেগিংস এবং পাজামা ফেরতযোগ্য নয় এবং পূর্ণমূল্য পূর্বপরিশোধযোগ্য।\r\n\r\n\r\n> ক্রয়কৃত প্রোডাক্টের বিনিময়ে কোনো আর্থিক মূল্য অফেরতযোগ্য।', 'Three-Piece', '[\"S\",\"M\",\"L\",\"XL\",\"XS\",\"XXL\"]', 0.00, '[\"http:\\/\\/localhost\\/project2\\/uploads\\/prod_692e8ed3651d11764658899.webp\",\"http:\\/\\/localhost\\/project2\\/uploads\\/prod_692e8ed36543d1764658899.webp\"]', 'http://localhost/project2/uploads/prod_692e8ed364d731764658899.webp'),
(15, 'Womens Off White Shirt', 9, 11, 'TW25-03EF-93342', 1990.00, 1500.00, 54, 'White Shirt', 'Crafted from linen cotton, this regular fit long sleeve shirt is perfect for everyday wear. It features a clean, straight hemline and offers breathable comfort with a simple, classic look. A versatile piece for any casual wardrobe.\r\n\r\n\r\nMaterial: Linen cotton Fabric.\r\n\r\n\r\nRegular Fit\r\n\r\n\r\nCare Instruction:\r\n✓ Wash dark colors separately\r\n✓ Do not bleach\r\n✓ Wash mild detergent\r\n✓ Cold water soft wash\r\n✓ Wash & Warm iron inside out\r\n✓ Do not tumble dry\r\n✓ Don\'t rub\r\n✓ Do not iron directly on print, embroidery & karchupi\r\n✓ Color bleed issues Wash separately\r\n\r\n\r\nHI-SHT-TW25-03EF-93342\r\n\r\n', 'Shirt', '[\"S\",\"M\",\"L\",\"XL\",\"XS\",\"XXL\"]', 0.00, '[\"http:\\/\\/localhost\\/project2\\/uploads\\/prod_692ed6403c3e01764677184.webp\",\"http:\\/\\/localhost\\/project2\\/uploads\\/prod_692ed6403c5561764677184.webp\",\"http:\\/\\/localhost\\/project2\\/uploads\\/prod_692ed6403c67e1764677184.webp\"]', 'http://localhost/project2/uploads/prod_692ed6403aa8d1764677184.webp'),
(16, 'Womens Radish Purple Top', 9, 12, 'LSHR17256', 1490.00, 1222.00, 49, 'Radish Purple Top', 'Elevate your style with this elegant radish purple top, crafted from polyester for a smooth and comfortable fit. Designed for both casual and semi-formal occasions, this top offers a flattering silhouette and a refined look. Perfect for effortless styling and all-day wear.\r\n\r\n\r\nMaterial: Cotton Blended\r\n\r\n\r\nRegular Fit\r\n\r\n\r\nCare Instruction:\r\n✓ Wash dark colors separately\r\n✓ Do not bleach\r\n✓ Wash mild detergent\r\n✓ Cold water soft wash\r\n✓ Wash & Warm iron inside out\r\n✓ Do not tumble dry\r\n✓ Don\'t rub\r\n✓ Color bleed issues Wash separately\r\n\r\n\r\nAA-DRS-TW24-06A-0045', 'Top', '[\"S\",\"M\",\"L\",\"XL\",\"XS\",\"XXL\"]', 0.00, '[\"http:\\/\\/localhost\\/project2\\/uploads\\/prod_692ed7b203a101764677554.webp\",\"http:\\/\\/localhost\\/project2\\/uploads\\/prod_692ed7b203b201764677554.webp\"]', 'http://localhost/project2/uploads/prod_692ed7b2036d51764677554.webp'),
(17, 'Womens Navy Two Piece Set', 10, 13, 'TW25-11WN', 7390.00, 7000.00, 52, 'Navy Two Piece Set', 'Elevate your festive style with this elegant womens navy ethnic two piece set, featuring a jacquard full-sleeve jacket paired with flared pants. The ensemble is beautifully embellished with ribbon work embroidery detailing, adding a refined traditional touch to your look. Perfect for special occasions and celebrations.\r\n\r\n\r\nMaterial: Top & bottom jacquard fabric.\r\n\r\n\r\nRegular Fit \r\n\r\n\r\nCare Instruction:\r\n✓ Wash dark colors separately\r\n✓ Do not bleach\r\n✓ Wash mild detergent\r\n✓ Cold water soft wash\r\n✓ Wash & Warm iron inside out\r\n✓ Do not tumble dry\r\n✓ Don\'t rub\r\n✓ Do not iron directly on print, embroidery & karchupi\r\n✓ Color bleed issues Wash separately\r\n\r\n\r\n\r\nSB-2PCS-TW25-11WN-104783\r\n\r\n', 'Two Piece', '[\"S\",\"M\",\"L\",\"XL\",\"XS\",\"XXL\"]', 150.00, '[\"http:\\/\\/localhost\\/project2\\/uploads\\/prod_692eda5e751861764678238.webp\",\"http:\\/\\/localhost\\/project2\\/uploads\\/prod_692eda5e7527e1764678238.webp\"]', 'http://localhost/project2/uploads/prod_692eda5e7502e1764678238.webp'),
(18, 'Women\'s Beige Blazer', 11, 14, 'TW25-11WSD', 5900.00, 5500.00, 47, 'Women\'s Beige Blazer', 'Elevate her winter wardrobe with this womens beige blazer, crafted from comfortable stretchable blended fabric for a refined fit. Designed in a single-breasted, one-button style with a peak lapel and matching interlining, it features a DTM plastic button and front pocket for a polished finish. Perfect for both formal and smart-casual looks.\r\n\r\n \r\n\r\nMaterial: Blended Fabric.\r\n\r\n\r\nSlim Fit\r\n\r\n\r\nCare Instruction:\r\n✓ Wash dark colors separately\r\n✓ Do not bleach\r\n✓ Do not dry clean\r\n✓ Warm Iron\r\n✓ Do not tumble dry\r\n✓ Wash & Iron inside out\r\n✓ Wash Separately\r\n\r\n\r\nAZ-BLZ-TW25-11W-600012\r\n\r\n', 'TW25-11W', '[\"S\",\"M\",\"L\",\"XL\",\"XS\",\"XXL\"]', 148.00, '[\"http:\\/\\/localhost\\/project2\\/uploads\\/prod_692edcd8b950d1764678872.webp\",\"http:\\/\\/localhost\\/project2\\/uploads\\/prod_692edcd8b961c1764678872.webp\",\"http:\\/\\/localhost\\/project2\\/uploads\\/prod_692edcd8b97401764678872.webp\"]', 'http://localhost/project2/uploads/prod_692edcd8b937c1764678872.webp'),
(29, 'Pakistani Style Salwar Suit', 51, 23, 'Pakistani Style', 5000.00, 2500.00, 20, 'Charizma Dastan-E-Jashan Premium Chiffon Unstitched 4pcs', '[Charizma Dastan-E-Jashan Premium Chiffon Unstitched 4pcs](https://www.jotey.com.bd/products/charizma-dastan-e-jashan-premium-chiffon-unstitched-4pcs-4?utm_source=gemini) পোশাকটির বিবরণ ও নির্দেশাবলির বাংলা অনুবাদ নিচে দেওয়া হলো:\r\n\r\n**বিবরণ (Description):**\r\n\r\n* **সামনের অংশ (Front):** এমব্রয়ডারি ও আড্ডা ওয়ার্ক করা ডাই করা শিফন – ১ মিটার\r\n* **হাতা (Sleeves):** এমব্রয়ডারি ও আড্ডা ওয়ার্ক করা ডাই করা শিফন – ২৬ ইঞ্চি\r\n* **পেছনের অংশ (Back):** ডাই করা শিফন – ১.২৫ মিটার\r\n* **সামনের নিচের অংশ (Front Daman):** এমব্রয়ডারি ও আড্ডা ওয়ার্ক করা – ৩০ ইঞ্চি\r\n* **হাতায় ব্যবহারের পটি (Sleeves Patti):** এমব্রয়ডারি করা – ১ মিটার\r\n* **পেছনের অংশ ও ট্রাউজারের পটি (Back and Trouser Patti):** এমব্রয়ডারি করা – ২.২৫ মিটার\r\n* **ভিতরের ইনার (Inner Shirt):** ডাই করা কাপড় – ২.২৫ মিটার\r\n* **ট্রাউজার/পায়জামা (Trouser):** এমব্রয়ডারি করা ডাই করা র সিল্ক – ২.৫০ মিটার\r\n* **ওড়নার পটি (Dupatta Patti):** এমব্রয়ডারি করা – ৮ মিটার\r\n* **ওড়না (Dupatta):** এমব্রয়ডারি করা ডাই করা অর্গানজা – ২.৫০ মিটার\r\n\r\n---\r\n\r\n**নির্দেশাবলী (Instructions):**\r\n\r\n* **উচ্চমানের কাপড়:** পণ্যটিতে উন্নতমানের ফেব্রিক ব্যবহার করা হয়েছে।\r\n* **বিবরণ দেখে নিন:** অর্ডার করার আগে অনুগ্রহ করে পণ্যের বিবরণটি মনোযোগ সহকারে পড়ে নিন, কারণ কেবল উল্লেখিত আইটেমগুলোই এর সাথে অন্তর্ভুক্ত থাকবে। মডেলের ছবিতে দেখানো অতিরিক্ত এক্সেসরিজ (যেমন: লেস, বোতাম ইত্যাদি) শুধুমাত্র স্টাইলিং ও সেলাইয়ের ধারণার জন্য ব্যবহার করা হয়েছে; এগুলো মূল পণ্যের সাথে থাকবে না।\r\n* **রঙের পার্থক্য:** ফটোগ্রাফিক লাইটিংয়ের উৎস বা আপনার মোবাইল/কম্পিউটার স্ক্রিনের ব্রাইটনেস সেটিংসের কারণে মূল পণ্যের রঙ ছবিতে কিছুটা ভিন্ন দেখাতে পারে।', '', '[]', 0.00, '[\"project2\\/uploads\\/prod_6ab2acaf03e6f_1790094511.webp\",\"project2\\/uploads\\/prod_6ab2acaf0401a_1790094511.webp\",\"project2\\/uploads\\/prod_6ab2acaf041b7_1790094511.webp\"]', 'project2/uploads/prod_6ab2acaf032ae_1790094511.webp'),
(30, 'Binodini Saree', 51, 25, '9505', 1500.00, 1200.00, 117, 'Binodini Saree', 'প্রিয়া রূপ ধরে এতদিনে এলে আমার কবিতা তুমি,\r\nআখির পলকে মরুভূমি যেন হয়ে গেল বনভূমি।\r\n\r\nশরদিন্দু পূজো আয়োজন-২০২৪ এর নতুন সংযোজন ‘ বিনোদিনী’\r\n\r\nবিবরনঃ\r\nশাড়ি– সাত গজ টাঙ্গাইলের সিল্ক শাড়ীতে ডিজিটাল প্রিন্ট। এটা টাংগাইল সিল্ক এর একটি ভ্যারিয়েন্ট দেখতে অনেকটা রাজশাহীর মসলিনের মতো।\r\nব্লাউজ পিস- ১.২৫ গজ পেপার সিল্কে ডিজিটাল প্রিন্ট\r\n\r\nমূল্যঃ\r\nশাড়ি – ২৮০০ টাকা\r\nব্লাউজ পিস- ৩৫০ টাকা', '', '[\"S\",\"M\",\"L\",\"XL\"]', 0.00, '[\"project2\\/uploads\\/prod_6ab94c08eaf24_1790528520.jpg\",\"project2\\/uploads\\/prod_6ab94c08eb112_1790528520.jpg\"]', 'project2/uploads/prod_6ab94c08e9e55_1790528520.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `subcategories`
--

CREATE TABLE `subcategories` (
  `id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `subcategory_name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subcategories`
--

INSERT INTO `subcategories` (`id`, `category_id`, `subcategory_name`, `slug`) VALUES
(5, 7, 'Silk Sarees', 'silk-sarees'),
(6, 7, 'Cotton Sarees', 'cotton-sarees'),
(7, 7, 'Printed Sarees', 'printed-sarees'),
(8, 7, 'Embroidered Sarees', 'embroidered-sarees'),
(9, 7, 'Regional Traditional Sarees', 'regional-traditional-sarees'),
(10, 8, 'Three-Piece Sets', 'three-piece-sets'),
(11, 9, 'Womens Shirt', 'womens-shirt'),
(12, 9, 'Purple Top', 'purple-top'),
(13, 10, 'Two Piece Set', 'two-piece-set'),
(14, 11, 'Women\'s Beige Blazer', 'women-s-beige-blazer'),
(19, 26, 'Taj', 'taj'),
(20, 52, 'Topwear', 'topwear'),
(21, 52, 'Bottomwear', 'bottomwear'),
(22, 52, 'Ethnic Wear', 'ethnic-wear'),
(23, 51, 'Traditional Wear', 'traditional-wear'),
(24, 51, 'Western Wear', 'western-wear'),
(25, 51, 'Ethnic Gowns', 'ethnic-gowns'),
(26, 50, 'Boys\' Clothing', 'boys-clothing'),
(27, 50, 'Girls\' Clothing', 'girls-clothing'),
(28, 50, 'Infant Care', 'infant-care'),
(29, 49, 'Men\'s Winter', 'men-s-winter'),
(30, 49, 'Women\'s Winter', 'women-s-winter'),
(31, 48, 'Men\'s Shoes', 'men-s-shoes'),
(32, 48, 'Women\'s Shoes', 'women-s-shoes'),
(33, 47, 'Gym Wear', 'gym-wear'),
(34, 47, 'Jersey', 'jersey'),
(35, 46, 'Men\'s Innerwear', 'men-s-innerwear'),
(36, 46, 'Women\'s Nightwear', 'women-s-nightwear'),
(37, 45, 'Ladies Bags', 'ladies-bags'),
(38, 45, 'Backpacks', 'backpacks'),
(39, 44, 'Watches', 'watches'),
(40, 44, 'Jewelry', 'jewelry'),
(41, 41, 'Personal', 'personal'),
(42, 41, 'Seasonal', 'seasonal');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `acc_cashbook`
--
ALTER TABLE `acc_cashbook`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cash_date` (`entry_date`);

--
-- Indexes for table `acc_expenses`
--
ALTER TABLE `acc_expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_expense_date` (`expense_date`);

--
-- Indexes for table `acc_purchases`
--
ALTER TABLE `acc_purchases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_purchase_date` (`purchase_date`),
  ADD KEY `idx_purchase_product` (`product_id`);

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_orders_customer_token_hash` (`customer_token_hash`),
  ADD KEY `idx_customer_token_hash` (`customer_token_hash`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_product_category` (`category_id`),
  ADD KEY `fk_product_subcategory` (`subcategory_id`);

--
-- Indexes for table `subcategories`
--
ALTER TABLE `subcategories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `category_id` (`category_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `acc_cashbook`
--
ALTER TABLE `acc_cashbook`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `acc_expenses`
--
ALTER TABLE `acc_expenses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `acc_purchases`
--
ALTER TABLE `acc_purchases`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=56;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `subcategories`
--
ALTER TABLE `subcategories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_product_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `fk_product_subcategory` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories` (`id`);

--
-- Constraints for table `subcategories`
--
ALTER TABLE `subcategories`
  ADD CONSTRAINT `subcategories_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
