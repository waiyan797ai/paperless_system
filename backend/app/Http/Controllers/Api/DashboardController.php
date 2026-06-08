<?php

namespace App\Http\Controllers\Api;

use App\Enums\InterRequestStatus;
use App\Enums\RequestStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\FormRequest;
use App\Models\InterRequest;
use App\Models\Notification;
use App\Models\RequestApproval;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $stats = match (true) {
            $user->hasRole(UserRole::SuperAdmin, UserRole::Admin) => $this->adminStats(),
            $user->hasRole(UserRole::DepartmentAdmin, UserRole::DepartmentHead) => $this->departmentHeadStats($user),
            $user->hasRole(UserRole::SectionAdmin) => $this->sectionAdminStats($user),
            default => $this->employeeStats($user),
        };

        return response()->json(['data' => $stats]);
    }

    protected function adminStats(): array
    {
        return [
            'total_users' => User::count(),
            'pending_requests' => FormRequest::where('status', RequestStatus::Pending)->count(),
            'pending_inter_requests' => InterRequest::where('status', InterRequestStatus::Pending)->count(),
            'total_documents' => Document::count(),
            'recent_requests' => FormRequest::with('user')->latest()->limit(5)->get(),
        ];
    }

    protected function departmentHeadStats(User $user): array
    {
        $departmentId = $user->department_id;

        return [
            'department_employees' => User::where('department_id', $departmentId)->count(),
            'department_pending_requests' => FormRequest::whereHas('user', fn ($q) => $q->where('department_id', $departmentId))
                ->where('status', RequestStatus::Pending)->count(),
            'incoming_inter_requests' => InterRequest::where('to_department_id', $departmentId)
                ->whereIn('status', [InterRequestStatus::Pending, InterRequestStatus::Processing])->count(),
            'unread_notifications' => Notification::where('user_id', $user->id)->whereNull('read_at')->count(),
        ];
    }

    protected function sectionAdminStats(User $user): array
    {
        return [
            'section_inbox' => FormRequest::where('target_section_id', $user->section_id)
                ->where('status', RequestStatus::AtSection)->count(),
            'assigned_to_me' => FormRequest::where('assigned_to_id', $user->id)
                ->where('status', RequestStatus::Assigned)->count(),
            'my_requests' => FormRequest::where('user_id', $user->id)->count(),
            'unread_notifications' => Notification::where('user_id', $user->id)->whereNull('read_at')->count(),
        ];
    }

    protected function employeeStats(User $user): array
    {
        return [
            'my_requests' => FormRequest::where('user_id', $user->id)->count(),
            'draft_requests' => FormRequest::where('user_id', $user->id)->where('status', RequestStatus::Draft)->count(),
            'pending_requests' => FormRequest::where('user_id', $user->id)->where('status', RequestStatus::Pending)->count(),
            'my_inter_requests' => InterRequest::where('requester_id', $user->id)->count(),
            'unread_notifications' => Notification::where('user_id', $user->id)->whereNull('read_at')->count(),
        ];
    }
}
