<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$id = $argv[1] ?? null;
if (!$id) {
    echo "MISSING_ID\n";
    exit(1);
}

$letter = App\Models\Letter::with(['template','creator','latestApproval.reviewer'])->find($id);
if (!$letter) {
    echo "NOT_FOUND\n";
    exit(0);
}

echo json_encode($letter->toArray());
