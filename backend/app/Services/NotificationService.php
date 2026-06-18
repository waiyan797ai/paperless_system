<?php

namespace App\Services;

use App\Enums\NotificationType;
use App\Events\NotificationSent;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Collection;

class NotificationService
{
    private $firebaseService;

    public function __construct(FirebaseService $firebaseService = null)
    {
        $this->firebaseService = $firebaseService;
    }

    public function create(
        User|int $user,
        NotificationType|string $type,
        string $title,
        string $message,
        ?array $data = null,
    ): Notification {
        $notification = Notification::create([
            'user_id' => $user instanceof User ? $user->id : $user,
            'type' => $type instanceof NotificationType ? $type->value : $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
        ]);

        event(new NotificationSent($notification));

        // Send Firebase push notification if service is available
        if ($this->firebaseService) {
            $userModel = $user instanceof User ? $user : User::find($user);
            if ($userModel && $userModel->fcm_token) {
                $this->firebaseService->sendNotification(
                    $userModel->fcm_token,
                    $title,
                    $message,
                    array_merge($data ?? [], [
                        'type' => $notification->type,
                        'notification_id' => $notification->id,
                    ])
                );
            }
        }

        return $notification;
    }

    public function notifyMany(
        Collection|array $users,
        NotificationType|string $type,
        string $title,
        string $message,
        ?array $data = null,
    ): void {
        foreach ($users as $user) {
            $this->create($user, $type, $title, $message, $data);
        }
    }

    public function markAsRead(Notification $notification): Notification
    {
        if (! $notification->read_at) {
            $notification->update(['read_at' => now()]);
        }

        return $notification->fresh();
    }

    public function markAllAsRead(User $user): int
    {
        return Notification::where('user_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }
}
