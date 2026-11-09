<?php
// Copy to config.php. Leave out anything you don't need: SQLite in ./data is the default.
return [
    'dsn' => 'mysql:host=127.0.0.1;dbname=chopspot;charset=utf8mb4',
    'user' => 'chopspot',
    'pass' => 'change-me',
    'origins' => ['https://chopspot.vercel.app'],
];
