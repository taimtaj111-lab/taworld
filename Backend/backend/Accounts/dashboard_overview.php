<?php
/*
 * TajWorld - Dashboard overview data (read-only)
 * GET  dashboard_overview.php
 * connect.php sends CORS headers and answers OPTIONS requests.
 */

ini_set("display_errors", "0");
error_reporting(E_ALL);

require_once __DIR__ . "/../config/connect.php";

date_default_timezone_set("Asia/Dhaka");
header("Cache-Control: no-store, no-cache, must-revalidate");

/* valid order = not cancelled and not refunded */
const DV_VALID = "COALESCE(o.order_status,'Pending') <> 'Cancelled' AND COALESCE(o.payment_status,'Pending') <> 'Refunded'";

/* order amount = subtotal + delivery + service charge */
const DV_AMT = "CASE WHEN COALESCE(o.total_price,0) > 0 THEN o.total_price ELSE COALESCE(o.total_amount,0) + COALESCE(o.delivery_charge,0) + COALESCE(o.service_charge,0) END";

const DV_LOW_STOCK = 5;

function dvOut(array $payload, int $status = 200)
{
    http_response_code($status);
    echo json_encode(
        $payload,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
    );
    exit;
}

function dvRows(mysqli $conn, string $sql, string $types = "", array $params = []): array
{
    $stmt = $conn->prepare($sql);

    if ($types !== "") {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $res = $stmt->get_result();
    $rows = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    $stmt->close();

    return $rows;
}

function dvCol(mysqli $conn, string $table, string $column): bool
{
    $r = dvRows(
        $conn,
        "SELECT COUNT(*) AS c FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
        "ss",
        [$table, $column]
    );

    return (int)($r[0]["c"] ?? 0) > 0;
}

function dvSales(mysqli $conn, DateTime $from, DateTime $to): array
{
    $r = dvRows(
        $conn,
        "SELECT COUNT(*) AS c, COALESCE(SUM(" . DV_AMT . "),0) AS s
         FROM orders o
         WHERE " . DV_VALID . " AND o.created_at >= ? AND o.created_at < ?",
        "ss",
        [$from->format("Y-m-d H:i:s"), $to->format("Y-m-d H:i:s")]
    );

    return [
        "sales" => round((float)($r[0]["s"] ?? 0), 2),
        "orders" => (int)($r[0]["c"] ?? 0),
    ];
}

/* Works with products.category_id + categories.category_name, or a plain products.category text column */
function dvCategories(mysqli $conn): array
{
    $out = ["top" => [], "stock" => []];

    try {
        $nameExpr = "";
        $join = "";

        if (
            dvCol($conn, "products", "category_id") &&
            dvCol($conn, "categories", "id") &&
            dvCol($conn, "categories", "category_name")
        ) {
            $nameExpr = "COALESCE(c.category_name,'Uncategorized')";
            $join = "LEFT JOIN categories c ON c.id = p.category_id";
        } elseif (dvCol($conn, "products", "category")) {
            $nameExpr = "COALESCE(NULLIF(p.category,''),'Uncategorized')";
        } else {
            return $out;
        }

        $stock = dvRows($conn, "
            SELECT $nameExpr AS name, COUNT(*) AS products, COALESCE(SUM(COALESCE(p.stock,0)),0) AS units
            FROM products p $join
            GROUP BY $nameExpr
            ORDER BY units DESC
            LIMIT 8
        ");

        foreach ($stock as $r) {
            $out["stock"][] = [
                "name" => (string)$r["name"],
                "products" => (int)$r["products"],
                "units" => (int)$r["units"],
            ];
        }

        $top = dvRows($conn, "
            SELECT $nameExpr AS name, SUM(oi.quantity) AS qty, SUM(oi.quantity * oi.price) AS revenue
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            JOIN products p ON p.id = oi.product_id
            $join
            WHERE " . DV_VALID . "
            GROUP BY $nameExpr
            ORDER BY revenue DESC
            LIMIT 5
        ");

        foreach ($top as $r) {
            $out["top"][] = [
                "name" => (string)$r["name"],
                "qty" => (int)$r["qty"],
                "revenue" => round((float)$r["revenue"], 2),
            ];
        }
    } catch (Throwable $e) {
        error_log("[dashboard_overview:categories] " . $e->getMessage());
    }

    return $out;
}

function dvPurchaseTotal(mysqli $conn): float
{
    try {
        $r = dvRows($conn, "SELECT COALESCE(SUM(total_cost),0) AS t FROM acc_purchases");
        return round((float)($r[0]["t"] ?? 0), 2);
    } catch (Throwable $e) {
        return 0.0; // table not created yet
    }
}

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new RuntimeException("Database connection unavailable.");
    }

    $tz = new DateTimeZone("Asia/Dhaka");
    $now = new DateTime("now", $tz);

    $today = new DateTime("today", $tz);
    $tomorrow = (clone $today)->modify("+1 day");
    $yesterday = (clone $today)->modify("-1 day");

    $weekStart = (new DateTime("monday this week", $tz))->setTime(0, 0);
    $lastWeek = (clone $weekStart)->modify("-1 week");
    $nextWeek = (clone $weekStart)->modify("+1 week");

    $monthStart = new DateTime("first day of this month 00:00:00", $tz);
    $lastMonth = (clone $monthStart)->modify("-1 month");
    $nextMonth = (clone $monthStart)->modify("+1 month");

    /* ----- comparison with the previous period ----- */
    $compare = [
        "today" => dvSales($conn, $today, $tomorrow),
        "yesterday" => dvSales($conn, $yesterday, $today),
        "this_week" => dvSales($conn, $weekStart, $nextWeek),
        "last_week" => dvSales($conn, $lastWeek, $weekStart),
        "this_month" => dvSales($conn, $monthStart, $nextMonth),
        "last_month" => dvSales($conn, $lastMonth, $monthStart),
    ];

    /* ----- weekly sales: last 12 weeks (oldest -> newest) ----- */
    $firstWeek = (clone $weekStart)->modify("-11 weeks");

    $wRows = dvRows($conn, "
        SELECT DATE_SUB(DATE(o.created_at), INTERVAL WEEKDAY(o.created_at) DAY) AS ws,
               COUNT(*) AS c, COALESCE(SUM(" . DV_AMT . "),0) AS s
        FROM orders o
        WHERE " . DV_VALID . " AND o.created_at >= ? AND o.created_at < ?
        GROUP BY ws
    ", "ss", [$firstWeek->format("Y-m-d H:i:s"), $nextWeek->format("Y-m-d H:i:s")]);

    $wMap = [];
    foreach ($wRows as $r) {
        $wMap[(string)$r["ws"]] = $r;
    }

    $weekly = [];
    for ($i = 11; $i >= 0; $i--) {
        $d = (clone $weekStart)->modify("-$i weeks");
        $key = $d->format("Y-m-d");
        $weekly[] = [
            "label" => $d->format("d M"),
            "orders" => (int)($wMap[$key]["c"] ?? 0),
            "sales" => round((float)($wMap[$key]["s"] ?? 0), 2),
        ];
    }

    /* ----- yearly sales: last 5 years (oldest -> newest) ----- */
    $thisYear = (int)$now->format("Y");
    $firstYear = $thisYear - 4;

    $yRows = dvRows($conn, "
        SELECT YEAR(o.created_at) AS y, COUNT(*) AS c, COALESCE(SUM(" . DV_AMT . "),0) AS s
        FROM orders o
        WHERE " . DV_VALID . " AND o.created_at >= ? AND o.created_at < ?
        GROUP BY YEAR(o.created_at)
    ", "ss", ["$firstYear-01-01 00:00:00", ($thisYear + 1) . "-01-01 00:00:00"]);

    $yMap = [];
    foreach ($yRows as $r) {
        $yMap[(string)$r["y"]] = $r;
    }

    $yearly = [];
    for ($y = $firstYear; $y <= $thisYear; $y++) {
        $yearly[] = [
            "label" => (string)$y,
            "orders" => (int)($yMap[(string)$y]["c"] ?? 0),
            "sales" => round((float)($yMap[(string)$y]["s"] ?? 0), 2),
        ];
    }

    /* ----- order status counts ----- */
    $statuses = ["Pending" => 0, "Processing" => 0, "Shipped" => 0, "Delivered" => 0, "Cancelled" => 0];

    $stRows = dvRows($conn, "
        SELECT COALESCE(order_status,'Pending') AS s, COUNT(*) AS c
        FROM orders
        GROUP BY COALESCE(order_status,'Pending')
    ");

    foreach ($stRows as $r) {
        $statuses[(string)$r["s"]] = (int)$r["c"];
    }

    $returned = (int)dvRows($conn, "
        SELECT COUNT(*) AS c FROM orders
        WHERE COALESCE(payment_status,'') = 'Refunded' AND COALESCE(order_status,'') <> 'Cancelled'
    ")[0]["c"];

    /* ----- inventory ----- */
    $inv = dvRows($conn, "
        SELECT
            COUNT(*) AS total,
            COALESCE(SUM(COALESCE(stock,0)),0) AS units,
            COALESCE(SUM(CASE WHEN COALESCE(stock,0) > " . DV_LOW_STOCK . " THEN 1 ELSE 0 END),0) AS in_stock,
            COALESCE(SUM(CASE WHEN COALESCE(stock,0) > 0 AND COALESCE(stock,0) <= " . DV_LOW_STOCK . " THEN 1 ELSE 0 END),0) AS low_stock,
            COALESCE(SUM(CASE WHEN COALESCE(stock,0) <= 0 THEN 1 ELSE 0 END),0) AS out_of_stock
        FROM products
    ")[0];

    $lowRows = dvRows($conn, "
        SELECT id, product_name, COALESCE(stock,0) AS stock
        FROM products
        WHERE COALESCE(stock,0) <= " . DV_LOW_STOCK . "
        ORDER BY stock ASC, id DESC
        LIMIT 8
    ");

    $lowList = [];
    foreach ($lowRows as $r) {
        $lowList[] = [
            "id" => (int)$r["id"],
            "name" => (string)$r["product_name"],
            "stock" => (int)$r["stock"],
        ];
    }

    /* ----- top selling products ----- */
    $topRows = dvRows($conn, "
        SELECT oi.product_id, MAX(oi.product_name) AS name,
               SUM(oi.quantity) AS qty, SUM(oi.quantity * oi.price) AS revenue,
               COALESCE(MAX(p.stock),0) AS stock
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE " . DV_VALID . "
        GROUP BY oi.product_id
        ORDER BY qty DESC
        LIMIT 5
    ");

    $topProducts = [];
    foreach ($topRows as $r) {
        $topProducts[] = [
            "id" => (int)$r["product_id"],
            "name" => (string)$r["name"],
            "qty" => (int)$r["qty"],
            "revenue" => round((float)$r["revenue"], 2),
            "stock" => (int)$r["stock"],
        ];
    }

    /* ----- recent orders ----- */
    $recentRows = dvRows($conn, "
        SELECT o.id, o.customer_name,
               (" . DV_AMT . ") AS amount,
               COALESCE(o.order_status,'Pending') AS order_status,
               COALESCE(o.payment_status,'Pending') AS payment_status,
               COALESCE(o.payment_method,'COD') AS payment_method,
               o.created_at
        FROM orders o
        ORDER BY o.id DESC
        LIMIT 8
    ");

    $recent = [];
    foreach ($recentRows as $r) {
        $recent[] = [
            "id" => (int)$r["id"],
            "customer_name" => (string)$r["customer_name"],
            "amount" => round((float)$r["amount"], 2),
            "order_status" => (string)$r["order_status"],
            "payment_status" => (string)$r["payment_status"],
            "payment_method" => (string)$r["payment_method"],
            "created_at" => (string)$r["created_at"],
        ];
    }

    $cats = dvCategories($conn);

    dvOut([
        "success" => true,
        "low_stock_limit" => DV_LOW_STOCK,
        "compare" => $compare,
        "weekly" => $weekly,
        "yearly" => $yearly,
        "statuses" => $statuses,
        "returned" => $returned,
        "inventory" => [
            "total_products" => (int)$inv["total"],
            "total_units" => (int)$inv["units"],
            "in_stock" => (int)$inv["in_stock"],
            "low_stock" => (int)$inv["low_stock"],
            "out_of_stock" => (int)$inv["out_of_stock"],
        ],
        "low_list" => $lowList,
        "top_products" => $topProducts,
        "top_categories" => $cats["top"],
        "category_stock" => $cats["stock"],
        "recent_orders" => $recent,
        "purchase_total" => dvPurchaseTotal($conn),
    ]);
} catch (Throwable $e) {
    error_log("[dashboard_overview] " . date("Y-m-d H:i:s") . " | " . $e->getMessage());

    dvOut([
        "success" => false,
        "message" => "Unable to load dashboard data. Check the PHP error log.",
    ], 500);
}