<?php

namespace App\Services;

use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification as FirebaseNotification;

class FirebaseService
{
    private $messaging;

    public function __construct()
    {
        if (!env('FIREBASE_PROJECT_ID') || !env('FIREBASE_PRIVATE_KEY')) {
            throw new \Exception('Firebase configuration is missing. Please set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL in your .env file.');
        }

        $this->messaging = (new Factory)
            ->withServiceAccount([
                'type' => 'service_account',
                'project_id' => env('FIREBASE_PROJECT_ID'),
                'private_key' => env('FIREBASE_PRIVATE_KEY'),
                'client_email' => env('FIREBASE_CLIENT_EMAIL'),
            ])
            ->createMessaging();
    }

    public function sendNotification($deviceToken, $title, $message, $data = [])
    {
        $notification = FirebaseNotification::create($title, $message);

        $message = CloudMessage::withTarget(CloudMessage::TARGET_TOKEN, $deviceToken)
            ->withNotification($notification);

        if (!empty($data)) {
            $message = $message->withData($data);
        }

        try {
            $this->messaging->send($message);
            return true;
        } catch (\Exception $e) {
            \Log::error('Firebase notification failed: ' . $e->getMessage());
            return false;
        }
    }

    public function sendNotificationToMultiple($deviceTokens, $title, $message, $data = [])
    {
        $notification = FirebaseNotification::create($title, $message);

        $message = CloudMessage::new()
            ->withNotification($notification);

        if (!empty($data)) {
            $message = $message->withData($data);
        }

        try {
            $this->messaging->sendMulticast($message, $deviceTokens);
            return true;
        } catch (\Exception $e) {
            \Log::error('Firebase multicast notification failed: ' . $e->getMessage());
            return false;
        }
    }
}
