<?php
/**
 * Aba Chop Spot cloud save.
 *
 *   POST /connect  { phone, pin, save, progress }  -> { token, phone, save, progress }
 *       New number: creates the account with this save.
 *       Known number + right PIN: keeps whichever save has more progress and returns it.
 *   POST /sync     { token, save, progress }        -> { ok, progress }
 *       Stores the save if it has at least as much progress as the one on file.
 *   POST /pull     { token }                         -> { save, progress }
 *
 * Progress is the player's lifetime earnings, so the bigger save always wins.
 * Five wrong PINs lock a number for 15 minutes.
 */

declare(strict_types=1);

$config = (is_file(__DIR__ . '/config.php') ? require __DIR__ . '/config.php' : []) + [
    'dsn' => 'sqlite:' . __DIR__ . '/data/saves.sqlite',
    'user' => null,
    'pass' => null,
    'origins' => ['https://chopspot.vercel.app', 'http://localhost:5173', 'http://localhost:4173'],
];

const MAX_SAVE_BYTES = 300000;
const MAX_FAILS = 5;
const LOCK_SECONDS = 900;

// ---------- request plumbing ----------
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $config['origins'], true) || in_array('*', $config['origins'], true)) {
    header('Access-Control-Allow-Origin: ' . ($origin ?: '*'));
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
}
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

function reply(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') reply(405, ['error' => 'Use POST']);
$raw = file_get_contents('php://input') ?: '';
if (strlen($raw) > MAX_SAVE_BYTES + 2000) reply(413, ['error' => 'Save is too big']);
$in = json_decode($raw, true);
if (!is_array($in)) reply(400, ['error' => 'Bad request']);
$route = trim((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
$route = basename($route);

// ---------- database ----------
if (str_starts_with($config['dsn'], 'sqlite:')) @mkdir(dirname(substr($config['dsn'], 7)), 0775, true);
$db = new PDO($config['dsn'], $config['user'], $config['pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$db->exec('CREATE TABLE IF NOT EXISTS players (
    phone VARCHAR(15) PRIMARY KEY,
    pin_hash VARCHAR(255) NOT NULL,
    save MEDIUMTEXT,
    progress BIGINT NOT NULL DEFAULT 0,
    failed INT NOT NULL DEFAULT 0,
    locked_until BIGINT NOT NULL DEFAULT 0,
    updated_at BIGINT NOT NULL DEFAULT 0
)');

// secret for signing tokens: from config, else made once and kept next to the database
$secret = $config['secret'] ?? null;
if (!$secret) {
    $file = __DIR__ . '/data/secret.key';
    @mkdir(dirname($file), 0775, true);
    if (!is_file($file)) file_put_contents($file, bin2hex(random_bytes(32)));
    $secret = trim((string) file_get_contents($file));
}

// ---------- helpers ----------
/** 0803 123 4567, +2348031234567 and 2348031234567 are all the same number */
function phone(string $p): ?string
{
    $d = preg_replace('/\D/', '', $p);
    if (strlen($d) === 11 && $d[0] === '0') $d = '234' . substr($d, 1);
    return strlen($d) >= 10 && strlen($d) <= 15 ? $d : null;
}

function save_in(array $in): array
{
    $save = $in['save'] ?? null;
    if (!is_array($save)) reply(400, ['error' => 'Missing save']);
    $json = json_encode($save);
    if (strlen($json) > MAX_SAVE_BYTES) reply(413, ['error' => 'Save is too big']);
    return [$json, max(0, (int) ($in['progress'] ?? 0))];
}

/** Tokens are signed, not stored, so one number can stay logged in on several phones. Changing the PIN signs them all out. */
function sign(string $phone, string $pinHash): string
{
    global $secret;
    return $phone . '.' . hash_hmac('sha256', $phone . '|' . $pinHash, $secret);
}

function by_token(PDO $db, array $in): array
{
    $t = (string) ($in['token'] ?? '');
    $phone = explode('.', $t)[0];
    $q = $db->prepare('SELECT * FROM players WHERE phone = ?');
    $q->execute([$phone]);
    $row = $q->fetch();
    if (!$row || !hash_equals(sign($row['phone'], $row['pin_hash']), $t)) reply(401, ['error' => 'Please log in again']);
    return $row;
}

// ---------- routes ----------
$now = time();

if ($route === 'connect') {
    $phone = phone((string) ($in['phone'] ?? '')) ?? reply(422, ['error' => 'Enter a valid phone number']);
    $pin = (string) ($in['pin'] ?? '');
    if (!preg_match('/^\d{4}$/', $pin)) reply(422, ['error' => 'PIN must be 4 digits']);
    [$save, $progress] = save_in($in);

    $q = $db->prepare('SELECT * FROM players WHERE phone = ?');
    $q->execute([$phone]);
    $row = $q->fetch();

    if (!$row) {
        $hash = password_hash($pin, PASSWORD_DEFAULT);
        $db->prepare('INSERT INTO players (phone, pin_hash, save, progress, updated_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([$phone, $hash, $save, $progress, $now]);
        reply(200, ['token' => sign($phone, $hash), 'phone' => $phone, 'save' => json_decode($save), 'progress' => $progress, 'created' => true]);
    }

    if ((int) $row['locked_until'] > $now) reply(429, ['error' => 'Too many tries. Wait 15 minutes']);
    if (!password_verify($pin, $row['pin_hash'])) {
        $fails = (int) $row['failed'] + 1;
        $db->prepare('UPDATE players SET failed = ?, locked_until = ? WHERE phone = ?')
            ->execute([$fails >= MAX_FAILS ? 0 : $fails, $fails >= MAX_FAILS ? $now + LOCK_SECONDS : 0, $phone]);
        reply(401, ['error' => 'Wrong PIN for this number']);
    }

    // the bigger save wins
    if ($progress > (int) $row['progress']) {
        $db->prepare('UPDATE players SET save = ?, progress = ?, failed = 0, updated_at = ? WHERE phone = ?')->execute([$save, $progress, $now, $phone]);
    } else {
        $db->prepare('UPDATE players SET failed = 0 WHERE phone = ?')->execute([$phone]);
        $save = $row['save']; $progress = (int) $row['progress'];
    }
    reply(200, ['token' => sign($phone, $row['pin_hash']), 'phone' => $phone, 'save' => json_decode($save), 'progress' => $progress]);
}

if ($route === 'sync') {
    $row = by_token($db, $in);
    [$save, $progress] = save_in($in);
    if ($progress >= (int) $row['progress']) {
        $db->prepare('UPDATE players SET save = ?, progress = ?, updated_at = ? WHERE phone = ?')->execute([$save, $progress, $now, $row['phone']]);
        reply(200, ['ok' => true, 'progress' => $progress]);
    }
    reply(200, ['ok' => false, 'progress' => (int) $row['progress']]);
}

if ($route === 'pull') {
    $row = by_token($db, $in);
    reply(200, ['save' => json_decode((string) $row['save']), 'progress' => (int) $row['progress']]);
}

reply(404, ['error' => 'Not found']);
