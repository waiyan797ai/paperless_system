<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class SystemController extends Controller
{
    public function uploadLimits(): JsonResponse
    {
        $uploadMax = ini_get('upload_max_filesize');
        $postMax = ini_get('post_max_size');

        return response()->json([
            'data' => [
                'upload_max_filesize' => $uploadMax,
                'post_max_size' => $postMax,
                'upload_max_bytes' => $this->toBytes($uploadMax),
                'post_max_bytes' => $this->toBytes($postMax),
                'recommended_min_bytes' => 30 * 1024 * 1024,
                'ok' => $this->toBytes($uploadMax) >= 30 * 1024 * 1024,
            ],
        ]);
    }

    protected function toBytes(string $value): int
    {
        $value = trim($value);
        if ($value === '') {
            return 0;
        }

        $unit = strtolower(substr($value, -1));
        $number = (float) $value;

        return (int) match ($unit) {
            'g' => $number * 1024 * 1024 * 1024,
            'm' => $number * 1024 * 1024,
            'k' => $number * 1024,
            default => (float) $value,
        };
    }
}
