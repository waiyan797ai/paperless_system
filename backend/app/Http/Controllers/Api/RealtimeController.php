<?php

namespace App\Http\Controllers\Api;

use App\Enums\RequestStatus;
use App\Http\Controllers\Controller;
use App\Models\FormRequest;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RealtimeController extends Controller
{
    public function stream(Request $request): StreamedResponse
    {
        $user = $this->resolveUser($request);

        if (! $user) {
            abort(401, 'Unauthorized.');
        }

        return response()->stream(function () use ($user) {
            @ini_set('zlib.output_compression', '0');
            @ini_set('output_buffering', 'off');
            @ini_set('implicit_flush', '1');
            if (function_exists('ob_implicit_flush')) {
                ob_implicit_flush(true);
            }
            while (ob_get_level() > 0) {
                ob_end_flush();
            }

            $lastNotificationId = (int) Notification::where('user_id', $user->id)->max('id');
            $lastCountsHash = $this->countsHash($user);
            $lastRequestVersion = (int) cache()->get($this->requestVersionKey($user->id), 0);
            $lastDocumentVersion = (int) cache()->get(self::documentVersionKey($user->id), 0);
            $startedAt = time();

            echo "event: connected\n";
            echo 'data: '.json_encode(['message' => 'connected'])."\n\n";
            flush();

            while (! connection_aborted() && (time() - $startedAt) < 300) {
                sleep(3);

                $newNotificationId = (int) Notification::where('user_id', $user->id)->max('id');
                if ($newNotificationId > $lastNotificationId) {
                    $notification = Notification::find($newNotificationId);
                    if ($notification) {
                        echo "event: notification\n";
                        echo 'data: '.json_encode([
                            'id' => $notification->id,
                            'type' => $notification->type,
                            'title' => $notification->title,
                            'message' => $notification->message,
                            'data' => $notification->data,
                            'read_at' => $notification->read_at,
                            'created_at' => $notification->created_at,
                        ])."\n\n";
                        $lastNotificationId = $newNotificationId;
                    }
                }

                $newCountsHash = $this->countsHash($user);
                if ($newCountsHash !== $lastCountsHash) {
                    echo "event: requests_updated\n";
                    echo 'data: '.json_encode(['counts' => $this->folderCounts($user)])."\n\n";
                    $lastCountsHash = $newCountsHash;
                }

                $newRequestVersion = (int) cache()->get($this->requestVersionKey($user->id), 0);
                if ($newRequestVersion > $lastRequestVersion) {
                    echo "event: requests_updated\n";
                    echo 'data: '.json_encode([
                        'version' => $newRequestVersion,
                        'counts' => $this->folderCounts($user),
                    ])."\n\n";
                    $lastRequestVersion = $newRequestVersion;
                }

                $newDocumentVersion = (int) cache()->get(self::documentVersionKey($user->id), 0);
                if ($newDocumentVersion > $lastDocumentVersion) {
                    echo "event: documents_updated\n";
                    echo 'data: '.json_encode(['version' => $newDocumentVersion])."\n\n";
                    $lastDocumentVersion = $newDocumentVersion;
                }

                echo ": heartbeat\n\n";
                flush();
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    protected function resolveUser(Request $request): ?User
    {
        if ($request->user()) {
            return $request->user();
        }

        $token = $request->query('token');
        if (! $token) {
            return null;
        }

        $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);

        return $accessToken?->tokenable;
    }

    public static function requestVersionKey(int $userId): string
    {
        return "realtime:requests:version:{$userId}";
    }

    public static function bumpRequestVersionForUsers(array $userIds): void
    {
        foreach (array_unique(array_filter($userIds)) as $userId) {
            cache()->increment(self::requestVersionKey((int) $userId));
        }
    }

    public static function documentVersionKey(int $userId): string
    {
        return "realtime:documents:version:{$userId}";
    }

    public static function bumpDocumentVersionForUsers(array $userIds): void
    {
        foreach (array_unique(array_filter($userIds)) as $userId) {
            cache()->increment(self::documentVersionKey((int) $userId));
        }
    }

    public function documentVersion(Request $request): \Illuminate\Http\JsonResponse
    {
        $version = (int) cache()->get(self::documentVersionKey($request->user()->id), 0);

        return response()->json(['data' => ['version' => $version]]);
    }

    protected function countsHash(User $user): string
    {
        return md5(json_encode($this->folderCounts($user)));
    }

    protected function folderCounts(User $user): array
    {
        $folders = ['outbox', 'inbox', 'dept_review', 'section_inbox', 'cc', 'approved', 'rejected'];
        $counts = [];

        foreach ($folders as $folder) {
            $query = FormRequest::query();
            $this->applyFolderFilter($query, $folder, $user);
            $counts[$folder] = $query->count();
        }

        return $counts;
    }

    protected function applyFolderFilter($query, string $folder, User $user): void
    {
        match ($folder) {
            'outbox' => $query->where('user_id', $user->id)
                ->where('status', '!=', RequestStatus::Draft->value),
            'inbox' => $query->where('review_department_id', $user->department_id)
                ->where('status', RequestStatus::Submitted->value),
            'dept_review' => $query->where('target_department_id', $user->department_id)
                ->where('status', RequestStatus::DeptApproved->value),
            'section_inbox' => $query->where('target_section_id', $user->section_id)
                ->where('status', RequestStatus::AtSection->value),
            'cc' => $query->whereHas('ccUsers', fn ($q) => $q->where('users.id', $user->id)),
            'approved' => $query->where('status', RequestStatus::Approved->value)
                ->when(! $user->isAdminLevel(), fn ($q) => $q->where(fn ($inner) => $inner
                    ->where('user_id', $user->id)
                    ->orWhere('target_department_id', $user->department_id))),
            'rejected' => $query->where('status', RequestStatus::Rejected->value)
                ->when(! $user->isAdminLevel(), fn ($q) => $q->where(fn ($inner) => $inner
                    ->where('user_id', $user->id)
                    ->orWhere('target_department_id', $user->department_id))),
            default => $query,
        };
    }
}
