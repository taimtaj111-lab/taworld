<?php
/*
 * TajWorld - E-commerce Accounts API (one file)
 *
 * GET  ?action=report
 * GET  ?action=purchases_stock
 * GET  ?action=expenses_cashbook
 * POST action = add_purchase | pay_purchase | delete_purchase
 *               add_expense | delete_expense
 *               add_cash    | delete_cash
 *
 * connect.php sends CORS headers and answers OPTIONS requests.
 * Tables are created automatically (CREATE TABLE IF NOT EXISTS).
 */

ini_set("display_errors", "0");
error_reporting(E_ALL);

require_once __DIR__ . "/../config/connect.php";

date_default_timezone_set("Asia/Dhaka");
header("Cache-Control: no-store, no-cache, must-revalidate");

const ACC_EXPENSE_CATEGORIES = ["Meta Ads", "Google Ads", "Delivery", "Packaging", "Salary", "Rent", "Other"];
const ACC_ACCOUNTS = ["Cash", "Bank", "bKash", "Nagad"];

/* A "valid" order = not cancelled and not refunded */
const ACC_VALID = "COALESCE(o.order_status,'Pending') <> 'Cancelled' AND COALESCE(o.payment_status,'Pending') <> 'Refunded'";

/* Order amount = subtotal + delivery + service charge */
const ACC_AMT = "CASE WHEN COALESCE(o.total_price,0) > 0 THEN o.total_price ELSE COALESCE(o.total_amount,0) + COALESCE(o.delivery_charge,0) + COALESCE(o.service_charge,0) END";

/* Average purchase cost per product (from acc_purchases) */
const ACC_AVGCOST = "(SELECT product_id, SUM(total_cost) / NULLIF(SUM(quantity),0) AS avg_cost FROM acc_purchases WHERE product_id IS NOT NULL GROUP BY product_id)";

/* Current selling price of a product */
const ACC_SELL = "CASE WHEN COALESCE(p.discount_price,0) > 0 AND p.discount_price < COALESCE(p.regular_price,0) THEN p.discount_price ELSE COALESCE(p.regular_price,0) END";

/* ---------------- helpers ---------------- */

function accOut(array $payload, int $status = 200)
{
    http_response_code($status);
    echo json_encode(
        $payload,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
    );
    exit;
}

function accFail(string $message, int $status = 422)
{
    throw new RuntimeException($message, $status);
}

function accRows(mysqli $conn, string $sql, string $types = "", array $params = []): array
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

function accRun(mysqli $conn, string $sql, string $types = "", array $params = []): int
{
    $stmt = $conn->prepare($sql);

    if ($types !== "") {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();

    return (int)$affected;
}

function accTx(mysqli $conn, callable $fn)
{
    $conn->begin_transaction();

    try {
        $result = $fn();
        $conn->commit();
        return $result;
    } catch (Throwable $e) {
        try {
            $conn->rollback();
        } catch (Throwable $ignored) {
        }
        throw $e;
    }
}

function accStr($v, int $max, bool $required = false, string $label = "Value"): string
{
    if ($v === null) {
        $v = "";
    }

    if (!is_string($v) && !is_numeric($v)) {
        accFail($label . " is invalid.");
    }

    $v = trim((string)$v);

    if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $v)) {
        accFail($label . " has invalid characters.");
    }

    if (mb_strlen($v, "UTF-8") > $max) {
        accFail($label . " is too long.");
    }

    if ($required && $v === "") {
        accFail($label . " is required.");
    }

    return $v;
}

function accDate($v, string $label = "Date"): string
{
    $s = is_string($v) ? trim($v) : "";

    if (
        !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $s, $m) ||
        !checkdate((int)$m[2], (int)$m[3], (int)$m[1])
    ) {
        accFail($label . " is invalid.");
    }

    return $s;
}

function accMoney($v, string $label = "Amount", bool $allowZero = false): float
{
    if (!is_numeric($v)) {
        accFail($label . " is invalid.");
    }

    $n = round((float)$v, 2);

    if (!is_finite($n) || $n < 0 || ($n == 0 && !$allowZero) || $n > 1000000000) {
        accFail($label . " is invalid.");
    }

    return $n;
}

function accInt($v, int $min, int $max, string $label): int
{
    $n = filter_var($v, FILTER_VALIDATE_INT);

    if ($n === false || $n < $min || $n > $max) {
        accFail($label . " is invalid.");
    }

    return (int)$n;
}

function accCast(array $rows, array $floats = [], array $ints = []): array
{
    foreach ($rows as &$r) {
        foreach ($floats as $k) {
            if (array_key_exists($k, $r)) {
                $r[$k] = (float)$r[$k];
            }
        }
        foreach ($ints as $k) {
            if (array_key_exists($k, $r)) {
                $r[$k] = (int)$r[$k];
            }
        }
    }
    unset($r);

    return $rows;
}

function accMap(array $rows, string $key): array
{
    $map = [];
    foreach ($rows as $r) {
        $map[(string)$r[$key]] = $r;
    }
    return $map;
}

/* ---------------- tables ---------------- */

function accEnsureTables(mysqli $conn)
{
    $conn->query("
        CREATE TABLE IF NOT EXISTS acc_purchases (
            id INT AUTO_INCREMENT PRIMARY KEY,
            purchase_date DATE NOT NULL,
            supplier_name VARCHAR(150) NOT NULL,
            product_id INT NULL,
            product_name VARCHAR(255) NOT NULL,
            quantity INT NOT NULL,
            unit_cost DECIMAL(12,2) NOT NULL,
            total_cost DECIMAL(14,2) NOT NULL,
            paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
            stock_added TINYINT(1) NOT NULL DEFAULT 0,
            note VARCHAR(500) NOT NULL DEFAULT '',
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_purchase_date (purchase_date),
            KEY idx_purchase_product (product_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    $conn->query("
        CREATE TABLE IF NOT EXISTS acc_expenses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            expense_date DATE NOT NULL,
            category VARCHAR(50) NOT NULL,
            amount DECIMAL(14,2) NOT NULL,
            note VARCHAR(500) NOT NULL DEFAULT '',
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_expense_date (expense_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    $conn->query("
        CREATE TABLE IF NOT EXISTS acc_cashbook (
            id INT AUTO_INCREMENT PRIMARY KEY,
            entry_date DATE NOT NULL,
            account VARCHAR(20) NOT NULL,
            entry_type VARCHAR(5) NOT NULL,
            amount DECIMAL(14,2) NOT NULL,
            description VARCHAR(500) NOT NULL DEFAULT '',
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_cash_date (entry_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
}

/* ---------------- shared summaries ---------------- */

function accStockRows(mysqli $conn): array
{
    $rows = accRows($conn, "
        SELECT
            p.id,
            p.product_name,
            COALESCE(p.stock,0) AS stock,
            COALESCE(pc.avg_cost,0) AS avg_cost,
            (" . ACC_SELL . ") AS sell_price
        FROM products p
        LEFT JOIN " . ACC_AVGCOST . " pc ON pc.product_id = p.id
        ORDER BY p.product_name ASC
        LIMIT 2000
    ");

    $rows = accCast($rows, ["avg_cost", "sell_price"], ["id", "stock"]);

    foreach ($rows as &$r) {
        $r["cost_value"] = round($r["stock"] * $r["avg_cost"], 2);
        $r["sell_value"] = round($r["stock"] * $r["sell_price"], 2);
    }
    unset($r);

    return $rows;
}

function accStockTotals(array $stockRows): array
{
    $qty = 0;
    $cost = 0.0;
    $sell = 0.0;

    foreach ($stockRows as $r) {
        $qty += $r["stock"];
        $cost += $r["cost_value"];
        $sell += $r["sell_value"];
    }

    return [
        "stock_qty" => $qty,
        "stock_cost_value" => round($cost, 2),
        "stock_sell_value" => round($sell, 2),
    ];
}

function accBalances(mysqli $conn): array
{
    $balances = [];
    foreach (ACC_ACCOUNTS as $a) {
        $balances[$a] = 0.0;
    }

    $rows = accRows($conn, "
        SELECT account,
               COALESCE(SUM(CASE WHEN entry_type = 'In' THEN amount ELSE -amount END),0) AS balance
        FROM acc_cashbook
        GROUP BY account
    ");

    foreach ($rows as $r) {
        $balances[$r["account"]] = round((float)$r["balance"], 2);
    }

    return $balances;
}

/* ---------------- REPORT ---------------- */

function accReport(mysqli $conn): array
{
    $tz = new DateTimeZone("Asia/Dhaka");
    $today = new DateTime("today", $tz);

    /* ----- daily: last 31 days ----- */
    $dStart = (clone $today)->modify("-30 days")->format("Y-m-d");
    $dEnd = (clone $today)->modify("+1 day")->format("Y-m-d");

    $dSales = accMap(accRows($conn, "
        SELECT DATE(o.created_at) AS d, COUNT(*) AS orders_count,
               COALESCE(SUM(" . ACC_AMT . "),0) AS sales
        FROM orders o
        WHERE " . ACC_VALID . " AND o.created_at >= ? AND o.created_at < ?
        GROUP BY DATE(o.created_at)
    ", "ss", [$dStart, $dEnd]), "d");

    $dCogs = accMap(accRows($conn, "
        SELECT DATE(o.created_at) AS d,
               COALESCE(SUM(oi.quantity * COALESCE(pc.avg_cost,0)),0) AS cogs
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        LEFT JOIN " . ACC_AVGCOST . " pc ON pc.product_id = oi.product_id
        WHERE " . ACC_VALID . " AND o.created_at >= ? AND o.created_at < ?
        GROUP BY DATE(o.created_at)
    ", "ss", [$dStart, $dEnd]), "d");

    $dExp = accMap(accRows($conn, "
        SELECT expense_date AS d, COALESCE(SUM(amount),0) AS total
        FROM acc_expenses
        WHERE expense_date >= ? AND expense_date < ?
        GROUP BY expense_date
    ", "ss", [$dStart, $dEnd]), "d");

    $daily = [];
    for ($i = 0; $i <= 30; $i++) {
        $d = (clone $today)->modify("-$i days")->format("Y-m-d");
        $s = (float)($dSales[$d]["sales"] ?? 0);
        $c = (float)($dCogs[$d]["cogs"] ?? 0);
        $e = (float)($dExp[$d]["total"] ?? 0);

        $daily[] = [
            "date" => $d,
            "orders" => (int)($dSales[$d]["orders_count"] ?? 0),
            "sales" => round($s, 2),
            "cogs" => round($c, 2),
            "expenses" => round($e, 2),
            "profit" => round($s - $c - $e, 2),
        ];
    }

    /* ----- monthly: last 12 months ----- */
    $thisMonth = new DateTime("first day of this month 00:00:00", $tz);
    $mStart = (clone $thisMonth)->modify("-11 months")->format("Y-m-d");
    $mEnd = (clone $thisMonth)->modify("+1 month")->format("Y-m-d");

    $mSales = accMap(accRows($conn, "
        SELECT DATE_FORMAT(o.created_at, '%Y-%m') AS ym, COUNT(*) AS orders_count,
               COALESCE(SUM(" . ACC_AMT . "),0) AS sales
        FROM orders o
        WHERE " . ACC_VALID . " AND o.created_at >= ? AND o.created_at < ?
        GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
    ", "ss", [$mStart, $mEnd]), "ym");

    $mCogs = accMap(accRows($conn, "
        SELECT DATE_FORMAT(o.created_at, '%Y-%m') AS ym,
               COALESCE(SUM(oi.quantity * COALESCE(pc.avg_cost,0)),0) AS cogs
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        LEFT JOIN " . ACC_AVGCOST . " pc ON pc.product_id = oi.product_id
        WHERE " . ACC_VALID . " AND o.created_at >= ? AND o.created_at < ?
        GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
    ", "ss", [$mStart, $mEnd]), "ym");

    $mExp = accMap(accRows($conn, "
        SELECT DATE_FORMAT(expense_date, '%Y-%m') AS ym, COALESCE(SUM(amount),0) AS total
        FROM acc_expenses
        WHERE expense_date >= ? AND expense_date < ?
        GROUP BY DATE_FORMAT(expense_date, '%Y-%m')
    ", "ss", [$mStart, $mEnd]), "ym");

    $monthly = [];
    for ($i = 0; $i <= 11; $i++) {
        $ym = (clone $thisMonth)->modify("-$i months")->format("Y-m");
        $s = (float)($mSales[$ym]["sales"] ?? 0);
        $c = (float)($mCogs[$ym]["cogs"] ?? 0);
        $e = (float)($mExp[$ym]["total"] ?? 0);

        $monthly[] = [
            "month" => $ym,
            "orders" => (int)($mSales[$ym]["orders_count"] ?? 0),
            "sales" => round($s, 2),
            "cogs" => round($c, 2),
            "expenses" => round($e, 2),
            "profit" => round($s - $c - $e, 2),
        ];
    }

    /* ----- all-time totals ----- */
    $tot = accRows($conn, "
        SELECT
            COUNT(*) AS total_orders,
            COALESCE(SUM(CASE WHEN " . ACC_VALID . " THEN 1 ELSE 0 END),0) AS valid_orders,
            COALESCE(SUM(CASE WHEN COALESCE(o.order_status,'') = 'Cancelled' THEN 1 ELSE 0 END),0) AS cancelled_orders,
            COALESCE(SUM(CASE WHEN " . ACC_VALID . " THEN " . ACC_AMT . " ELSE 0 END),0) AS sales
        FROM orders o
    ")[0];

    $allCogs = accRows($conn, "
        SELECT COALESCE(SUM(oi.quantity * COALESCE(pc.avg_cost,0)),0) AS cogs
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        LEFT JOIN " . ACC_AVGCOST . " pc ON pc.product_id = oi.product_id
        WHERE " . ACC_VALID . "
    ")[0]["cogs"];

    $allExp = accRows($conn, "SELECT COALESCE(SUM(amount),0) AS total FROM acc_expenses")[0]["total"];

    $totalSales = (float)$tot["sales"];
    $totalCogs = (float)$allCogs;
    $totalExp = (float)$allExp;

    /* ----- customer dues & COD ----- */
    $dueRows = accRows($conn, "
        SELECT COALESCE(o.payment_method,'COD') AS pm, COUNT(*) AS c,
               COALESCE(SUM(" . ACC_AMT . "),0) AS amt
        FROM orders o
        WHERE " . ACC_VALID . " AND COALESCE(o.payment_status,'Pending') IN ('Pending','Failed')
        GROUP BY COALESCE(o.payment_method,'COD')
    ");

    $codDue = 0.0;
    $codCount = 0;
    $onlinePending = 0.0;
    $onlineCount = 0;

    foreach ($dueRows as $r) {
        if ($r["pm"] === "COD") {
            $codDue += (float)$r["amt"];
            $codCount += (int)$r["c"];
        } else {
            $onlinePending += (float)$r["amt"];
            $onlineCount += (int)$r["c"];
        }
    }

    $dueList = accRows($conn, "
        SELECT o.id, o.customer_name, o.phone,
               COALESCE(o.payment_method,'COD') AS payment_method,
               COALESCE(o.payment_status,'Pending') AS payment_status,
               COALESCE(o.order_status,'Pending') AS order_status,
               (" . ACC_AMT . ") AS amount,
               o.created_at
        FROM orders o
        WHERE " . ACC_VALID . " AND COALESCE(o.payment_status,'Pending') IN ('Pending','Failed')
        ORDER BY o.id DESC
        LIMIT 100
    ");
    $dueList = accCast($dueList, ["amount"], ["id"]);

    /* ----- supplier dues, stock, cash ----- */
    $supplierDue = (float)accRows($conn, "
        SELECT COALESCE(SUM(total_cost - paid_amount),0) AS due FROM acc_purchases
    ")[0]["due"];

    $stockTotals = accStockTotals(accStockRows($conn));
    $balances = accBalances($conn);

    return [
        "success" => true,
        "summary" => array_merge([
            "total_orders" => (int)$tot["total_orders"],
            "valid_orders" => (int)$tot["valid_orders"],
            "cancelled_orders" => (int)$tot["cancelled_orders"],
            "total_sales" => round($totalSales, 2),
            "total_cogs" => round($totalCogs, 2),
            "total_expenses" => round($totalExp, 2),
            "net_profit" => round($totalSales - $totalCogs - $totalExp, 2),
            "today_sales" => $daily[0]["sales"],
            "today_profit" => $daily[0]["profit"],
            "month_sales" => $monthly[0]["sales"],
            "month_profit" => $monthly[0]["profit"],
            "cod_due" => round($codDue, 2),
            "cod_count" => $codCount,
            "online_pending" => round($onlinePending, 2),
            "online_count" => $onlineCount,
            "supplier_due" => round($supplierDue, 2),
            "cash_total" => round(array_sum($balances), 2),
            "balances" => $balances,
        ], $stockTotals),
        "daily" => $daily,
        "monthly" => $monthly,
        "dues" => $dueList,
    ];
}

/* ---------------- PURCHASES & STOCK ---------------- */

function accPurchasesStock(mysqli $conn): array
{
    $purchases = accRows($conn, "
        SELECT id, purchase_date, supplier_name, product_id, product_name,
               quantity, unit_cost, total_cost, paid_amount, stock_added, note
        FROM acc_purchases
        ORDER BY purchase_date DESC, id DESC
        LIMIT 500
    ");
    $purchases = accCast($purchases, ["unit_cost", "total_cost", "paid_amount"], ["id", "quantity", "stock_added"]);

    foreach ($purchases as &$p) {
        $p["product_id"] = $p["product_id"] === null ? null : (int)$p["product_id"];
        $p["due"] = round($p["total_cost"] - $p["paid_amount"], 2);
    }
    unset($p);

    $suppliers = accRows($conn, "
        SELECT supplier_name, COUNT(*) AS purchases_count,
               SUM(total_cost) AS total, SUM(paid_amount) AS paid
        FROM acc_purchases
        GROUP BY supplier_name
        ORDER BY (SUM(total_cost) - SUM(paid_amount)) DESC, supplier_name ASC
    ");
    $suppliers = accCast($suppliers, ["total", "paid"], ["purchases_count"]);

    foreach ($suppliers as &$s) {
        $s["due"] = round($s["total"] - $s["paid"], 2);
    }
    unset($s);

    $totalCost = 0.0;
    $totalPaid = 0.0;
    foreach ($purchases as $p) {
        $totalCost += $p["total_cost"];
        $totalPaid += $p["paid_amount"];
    }

    $allTotals = accRows($conn, "
        SELECT COALESCE(SUM(total_cost),0) AS total, COALESCE(SUM(paid_amount),0) AS paid
        FROM acc_purchases
    ")[0];

    $stock = accStockRows($conn);

    return [
        "success" => true,
        "purchases" => $purchases,
        "suppliers" => $suppliers,
        "products" => $stock,
        "summary" => array_merge([
            "total_purchase" => round((float)$allTotals["total"], 2),
            "total_paid" => round((float)$allTotals["paid"], 2),
            "supplier_due" => round((float)$allTotals["total"] - (float)$allTotals["paid"], 2),
        ], accStockTotals($stock)),
    ];
}

function accAddPurchase(mysqli $conn, array $d)
{
    $date = accDate($d["purchase_date"] ?? "", "Purchase date");
    $supplier = accStr($d["supplier_name"] ?? "", 150, true, "Supplier name");
    $note = accStr($d["note"] ?? "", 500, false, "Note");
    $qty = accInt($d["quantity"] ?? null, 1, 1000000, "Quantity");
    $unit = accMoney($d["unit_cost"] ?? null, "Unit cost");
    $paid = accMoney($d["paid_amount"] ?? 0, "Paid amount", true);
    $typedName = accStr($d["product_name"] ?? "", 255, false, "Product name");
    $updateStock = !empty($d["update_stock"]);

    $productId = null;
    $rawPid = $d["product_id"] ?? null;
    if ($rawPid !== null && $rawPid !== "") {
        $productId = accInt($rawPid, 1, 2147483647, "Product");
    }

    $total = round($qty * $unit, 2);

    if ($paid > $total + 0.001) {
        accFail("Paid amount cannot be more than the total cost.");
    }

    accTx($conn, function () use ($conn, $date, $supplier, $note, $qty, $unit, $paid, $typedName, $updateStock, $productId, $total) {
        $productName = $typedName;
        $stockAdded = 0;

        if ($productId !== null) {
            $p = accRows($conn, "SELECT id, product_name FROM products WHERE id = ? LIMIT 1 FOR UPDATE", "i", [$productId]);

            if (!$p) {
                accFail("Selected product was not found.");
            }

            $productName = (string)$p[0]["product_name"];

            if ($updateStock) {
                accRun($conn, "UPDATE products SET stock = COALESCE(stock,0) + ? WHERE id = ?", "ii", [$qty, $productId]);
                $stockAdded = 1;
            }
        }

        if ($productName === "") {
            accFail("Product name is required.");
        }

        accRun(
            $conn,
            "INSERT INTO acc_purchases
                (purchase_date, supplier_name, product_id, product_name, quantity, unit_cost, total_cost, paid_amount, stock_added, note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            "ssisidddis",
            [$date, $supplier, $productId, $productName, $qty, $unit, $total, $paid, $stockAdded, $note]
        );
    });

    accOut(["success" => true, "message" => "Purchase saved."], 201);
}

function accPayPurchase(mysqli $conn, array $d)
{
    $id = accInt($d["id"] ?? null, 1, 2147483647, "Purchase ID");
    $amount = accMoney($d["amount"] ?? null, "Payment amount");

    accTx($conn, function () use ($conn, $id, $amount) {
        $rows = accRows($conn, "SELECT total_cost, paid_amount FROM acc_purchases WHERE id = ? FOR UPDATE", "i", [$id]);

        if (!$rows) {
            accFail("Purchase not found.", 404);
        }

        $due = round((float)$rows[0]["total_cost"] - (float)$rows[0]["paid_amount"], 2);

        if ($amount > $due + 0.001) {
            accFail("Payment is more than the due amount (" . number_format($due, 2, ".", "") . ").");
        }

        accRun($conn, "UPDATE acc_purchases SET paid_amount = LEAST(total_cost, paid_amount + ?) WHERE id = ?", "di", [$amount, $id]);
    });

    accOut(["success" => true, "message" => "Supplier payment saved."]);
}

function accDeletePurchase(mysqli $conn, array $d)
{
    $id = accInt($d["id"] ?? null, 1, 2147483647, "Purchase ID");

    accTx($conn, function () use ($conn, $id) {
        $rows = accRows($conn, "SELECT product_id, quantity, stock_added FROM acc_purchases WHERE id = ? FOR UPDATE", "i", [$id]);

        if (!$rows) {
            accFail("Purchase not found.", 404);
        }

        $row = $rows[0];

        if ((int)$row["stock_added"] === 1 && $row["product_id"] !== null) {
            accRun(
                $conn,
                "UPDATE products SET stock = GREATEST(CAST(COALESCE(stock,0) AS SIGNED) - ?, 0) WHERE id = ?",
                "ii",
                [(int)$row["quantity"], (int)$row["product_id"]]
            );
        }

        accRun($conn, "DELETE FROM acc_purchases WHERE id = ?", "i", [$id]);
    });

    accOut(["success" => true, "message" => "Purchase deleted."]);
}

/* ---------------- EXPENSES & CASHBOOK ---------------- */

function accExpensesCashbook(mysqli $conn): array
{
    $monthStart = date("Y-m-01");

    $expenses = accRows($conn, "
        SELECT id, expense_date, category, amount, note
        FROM acc_expenses
        ORDER BY expense_date DESC, id DESC
        LIMIT 500
    ");
    $expenses = accCast($expenses, ["amount"], ["id"]);

    $catAll = accRows($conn, "SELECT category, SUM(amount) AS total FROM acc_expenses GROUP BY category");
    $catMonth = accRows(
        $conn,
        "SELECT category, SUM(amount) AS total FROM acc_expenses WHERE expense_date >= ? GROUP BY category",
        "s",
        [$monthStart]
    );

    $byCategory = [];
    foreach (ACC_EXPENSE_CATEGORIES as $c) {
        $byCategory[$c] = ["all" => 0.0, "month" => 0.0];
    }
    foreach ($catAll as $r) {
        $byCategory[$r["category"]]["all"] = round((float)$r["total"], 2);
    }
    foreach ($catMonth as $r) {
        $byCategory[$r["category"]]["month"] = round((float)$r["total"], 2);
    }

    $cash = accRows($conn, "
        SELECT id, entry_date, account, entry_type, amount, description
        FROM acc_cashbook
        ORDER BY entry_date DESC, id DESC
        LIMIT 500
    ");
    $cash = accCast($cash, ["amount"], ["id"]);

    $io = accRows($conn, "
        SELECT
            COALESCE(SUM(CASE WHEN entry_type = 'In' THEN amount ELSE 0 END),0) AS total_in,
            COALESCE(SUM(CASE WHEN entry_type = 'Out' THEN amount ELSE 0 END),0) AS total_out
        FROM acc_cashbook
    ")[0];

    $balances = accBalances($conn);

    $expAll = 0.0;
    $expMonth = 0.0;
    foreach ($byCategory as $v) {
        $expAll += $v["all"];
        $expMonth += $v["month"];
    }

    return [
        "success" => true,
        "expenses" => $expenses,
        "by_category" => $byCategory,
        "expense_total" => round($expAll, 2),
        "expense_month" => round($expMonth, 2),
        "cashbook" => $cash,
        "balances" => $balances,
        "cash_total" => round(array_sum($balances), 2),
        "total_in" => round((float)$io["total_in"], 2),
        "total_out" => round((float)$io["total_out"], 2),
        "categories" => ACC_EXPENSE_CATEGORIES,
        "accounts" => ACC_ACCOUNTS,
    ];
}

function accAddExpense(mysqli $conn, array $d)
{
    $date = accDate($d["expense_date"] ?? "", "Expense date");
    $category = accStr($d["category"] ?? "", 50, true, "Category");
    $amount = accMoney($d["amount"] ?? null, "Amount");
    $note = accStr($d["note"] ?? "", 500, false, "Note");

    if (!in_array($category, ACC_EXPENSE_CATEGORIES, true)) {
        accFail("Invalid expense category.");
    }

    accRun(
        $conn,
        "INSERT INTO acc_expenses (expense_date, category, amount, note) VALUES (?, ?, ?, ?)",
        "ssds",
        [$date, $category, $amount, $note]
    );

    accOut(["success" => true, "message" => "Expense saved."], 201);
}

function accDeleteRow(mysqli $conn, array $d, string $table, string $label)
{
    $id = accInt($d["id"] ?? null, 1, 2147483647, "ID");

    // $table is always one of two fixed names from the router below
    $affected = accRun($conn, "DELETE FROM " . $table . " WHERE id = ?", "i", [$id]);

    if ($affected < 1) {
        accFail($label . " not found.", 404);
    }

    accOut(["success" => true, "message" => $label . " deleted."]);
}

function accAddCash(mysqli $conn, array $d)
{
    $date = accDate($d["entry_date"] ?? "", "Date");
    $account = accStr($d["account"] ?? "", 20, true, "Account");
    $type = accStr($d["entry_type"] ?? "", 5, true, "Type");
    $amount = accMoney($d["amount"] ?? null, "Amount");
    $desc = accStr($d["description"] ?? "", 500, false, "Description");

    if (!in_array($account, ACC_ACCOUNTS, true)) {
        accFail("Invalid account.");
    }

    if (!in_array($type, ["In", "Out"], true)) {
        accFail("Invalid entry type.");
    }

    accRun(
        $conn,
        "INSERT INTO acc_cashbook (entry_date, account, entry_type, amount, description) VALUES (?, ?, ?, ?, ?)",
        "sssds",
        [$date, $account, $type, $amount, $desc]
    );

    accOut(["success" => true, "message" => "Cashbook entry saved."], 201);
}

/* ---------------- ROUTER ---------------- */

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        accFail("Database connection unavailable.", 500);
    }

    accEnsureTables($conn);

    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";

    if ($method === "GET") {
        $action = (string)($_GET["action"] ?? "report");

        switch ($action) {
            case "report":
                accOut(accReport($conn));
                break;
            case "purchases_stock":
                accOut(accPurchasesStock($conn));
                break;
            case "expenses_cashbook":
                accOut(accExpensesCashbook($conn));
                break;
            default:
                accFail("Unknown action.", 400);
        }
    } elseif ($method === "POST") {
        $raw = file_get_contents("php://input");

        if ($raw === false || strlen($raw) > 100000) {
            accFail("Invalid request body.", 400);
        }

        $data = json_decode($raw, true);

        if (!is_array($data)) {
            accFail("Invalid JSON request.", 400);
        }

        $action = (string)($data["action"] ?? "");

        switch ($action) {
            case "add_purchase":
                accAddPurchase($conn, $data);
                break;
            case "pay_purchase":
                accPayPurchase($conn, $data);
                break;
            case "delete_purchase":
                accDeletePurchase($conn, $data);
                break;
            case "add_expense":
                accAddExpense($conn, $data);
                break;
            case "delete_expense":
                accDeleteRow($conn, $data, "acc_expenses", "Expense");
                break;
            case "add_cash":
                accAddCash($conn, $data);
                break;
            case "delete_cash":
                accDeleteRow($conn, $data, "acc_cashbook", "Cashbook entry");
                break;
            default:
                accFail("Unknown action.", 400);
        }
    } else {
        accFail("Method not allowed.", 405);
    }
} catch (Throwable $e) {
    error_log("[accounts] " . date("Y-m-d H:i:s") . " | " . $e->getMessage());

    $code = $e->getCode();
    $status = ($e instanceof RuntimeException && is_int($code) && $code >= 400 && $code <= 599)
        ? $code
        : 500;

    accOut([
        "success" => false,
        "message" => $status < 500 ? $e->getMessage() : "Server error. Check the PHP error log.",
    ], $status);
}