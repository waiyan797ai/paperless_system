<?php

namespace App\Http\Controllers\Api;

use App\Enums\InterRequestStatus;
use App\Enums\RequestStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Document;
use App\Models\FormRequest;
use App\Models\InterRequest;
use App\Models\Notification;
use App\Models\Policy;
use App\Models\Section;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user()->load(['department', 'section', 'role']);

        $payload = match (true) {
            $user->hasRole(UserRole::SuperAdmin, UserRole::Admin) => $this->adminPayload($user),
            $user->hasRole(UserRole::Manager) && $user->section_id => $this->managerSectionPayload($user),
            $user->hasRole(UserRole::Manager) => $this->managerDepartmentPayload($user),
            default => $this->userPayload($user),
        };

        return response()->json(['data' => $payload]);
    }

    protected function adminPayload(User $user): array
    {
        $activeStatuses = [
            RequestStatus::Submitted->value,
            RequestStatus::DeptApproved->value,
            RequestStatus::AtSection->value,
            RequestStatus::Assigned->value,
            RequestStatus::Pending->value,
        ];

        return [
            'role_type' => 'admin',
            'title' => 'Admin Dashboard',
            'subtitle' => 'System-wide overview and analytics',
            'greeting' => $user->name,
            'stats' => [
                $this->stat('total_users', 'Total Users', User::where('status', 'active')->count(), 'users'),
                $this->stat('departments', 'Departments', Department::where('status', 'active')->count(), 'building'),
                $this->stat('sections', 'Sections', Section::where('status', 'active')->count(), 'layers'),
                $this->stat('active_requests', 'Active Requests', FormRequest::whereIn('status', $activeStatuses)->count(), 'clipboard'),
                $this->stat('open_inter_memos', 'Open Inter-Memos', InterRequest::whereIn('status', [InterRequestStatus::Pending, InterRequestStatus::Processing])->count(), 'arrow'),
                $this->stat('documents', 'Documents', Document::count(), 'file'),
                $this->stat('policies', 'Policies', Policy::count(), 'shield'),
                $this->stat('unread_notifications', 'Unread Alerts', $this->unreadCount($user), 'bell'),
            ],
            'recent_requests' => $this->formatRequests(
                FormRequest::with(['user', 'formTemplate', 'targetDepartment', 'assignedTo'])->latest()->limit(6)->get()
            ),
            'recent_inter_memos' => $this->formatInterMemos(
                InterRequest::with(['requester', 'assignee'])->latest()->limit(5)->get()
            ),
            'recent_notifications' => $this->formatNotifications(
                Notification::where('user_id', $user->id)->latest()->limit(5)->get()
            ),
            'request_trends' => $this->requestTrends(),
            'requests_by_status' => $this->requestsByStatus(FormRequest::query()),
        ];
    }

    protected function managerDepartmentPayload(User $user): array
    {
        $departmentId = $user->department_id;

        return [
            'role_type' => 'manager_department',
            'title' => ($user->department?->name ?? 'Department').' Dashboard',
            'subtitle' => 'Department workflow overview',
            'greeting' => $user->name,
            'department_name' => $user->department?->name,
            'stats' => [
                $this->stat('employees', 'Employees', User::where('department_id', $departmentId)->where('status', 'active')->count(), 'users'),
                $this->stat('sections', 'Sections', Section::where('department_id', $departmentId)->where('status', 'active')->count(), 'layers'),
                $this->stat('dept_inbox', 'Dept Inbox', FormRequest::where('review_department_id', $departmentId)->where('status', RequestStatus::Submitted)->count(), 'inbox'),
                $this->stat('to_assign', 'To Assign', FormRequest::where('target_department_id', $departmentId)->where('status', RequestStatus::DeptApproved)->count(), 'clipboard'),
                $this->stat('open_inter_memos', 'Open Inter-Memos', InterRequest::where(function ($q) use ($departmentId, $user) {
                    $q->where('from_department_id', $departmentId)
                        ->orWhere('to_department_id', $departmentId)
                        ->orWhere('assigned_to', $user->id);
                })->whereIn('status', [InterRequestStatus::Pending, InterRequestStatus::Processing])->count(), 'arrow'),
                $this->stat('incoming_documents', 'Incoming Mail', $this->incomingDocumentsCount($departmentId), 'file'),
                $this->stat('assigned_to_me', 'Assigned to Me', FormRequest::where('assigned_to_id', $user->id)->where('status', RequestStatus::Assigned)->count(), 'check'),
                $this->stat('unread_notifications', 'Unread Alerts', $this->unreadCount($user), 'bell'),
            ],
            'recent_requests' => $this->formatRequests(
                FormRequest::with(['user', 'formTemplate', 'targetDepartment', 'assignedTo'])
                    ->where(function (Builder $q) use ($departmentId, $user) {
                        $q->where('target_department_id', $departmentId)
                            ->orWhere('review_department_id', $departmentId)
                            ->orWhere('assigned_to_id', $user->id);
                    })
                    ->latest()
                    ->limit(6)
                    ->get()
            ),
            'recent_inter_memos' => $this->formatInterMemos(
                InterRequest::with(['requester', 'assignee'])
                    ->where(function ($q) use ($departmentId, $user) {
                        $q->where('from_department_id', $departmentId)
                            ->orWhere('to_department_id', $departmentId)
                            ->orWhere('requester_id', $user->id)
                            ->orWhere('assigned_to', $user->id);
                    })
                    ->latest()
                    ->limit(5)
                    ->get()
            ),
            'recent_notifications' => $this->formatNotifications(
                Notification::where('user_id', $user->id)->latest()->limit(5)->get()
            ),
            'request_trends' => $this->requestTrends(departmentId: $departmentId),
            'requests_by_status' => $this->requestsByStatus(
                FormRequest::where('target_department_id', $departmentId)
            ),
        ];
    }

    protected function managerSectionPayload(User $user): array
    {
        $sectionId = $user->section_id;
        $departmentId = $user->department_id;

        return [
            'role_type' => 'manager_section',
            'title' => ($user->section?->name ?? 'Section').' Dashboard',
            'subtitle' => 'Section workflow overview',
            'greeting' => $user->name,
            'department_name' => $user->department?->name,
            'section_name' => $user->section?->name,
            'stats' => [
                $this->stat('section_inbox', 'Section Inbox', FormRequest::where('target_section_id', $sectionId)->where('status', RequestStatus::AtSection)->count(), 'inbox'),
                $this->stat('assigned_to_me', 'Assigned to Me', FormRequest::where('assigned_to_id', $user->id)->where('status', RequestStatus::Assigned)->count(), 'check'),
                $this->stat('dept_inbox', 'Dept Inbox', FormRequest::where('review_department_id', $departmentId)->where('status', RequestStatus::Submitted)->count(), 'inbox'),
                $this->stat('my_requests', 'My Requests', FormRequest::where('user_id', $user->id)->count(), 'clipboard'),
                $this->stat('open_inter_memos', 'Open Inter-Memos', InterRequest::where('assigned_to', $user->id)->whereIn('status', [InterRequestStatus::Pending, InterRequestStatus::Processing])->count(), 'arrow'),
                $this->stat('incoming_documents', 'Incoming Mail', $this->incomingDocumentsCount($departmentId), 'file'),
                $this->stat('unread_notifications', 'Unread Alerts', $this->unreadCount($user), 'bell'),
            ],
            'recent_requests' => $this->formatRequests(
                FormRequest::with(['user', 'formTemplate', 'targetDepartment', 'assignedTo'])
                    ->where(function (Builder $q) use ($sectionId, $user) {
                        $q->where('target_section_id', $sectionId)
                            ->orWhere('assigned_to_id', $user->id)
                            ->orWhere('user_id', $user->id);
                    })
                    ->latest()
                    ->limit(6)
                    ->get()
            ),
            'recent_inter_memos' => $this->formatInterMemos(
                InterRequest::with(['requester', 'assignee'])
                    ->where(function ($q) use ($user) {
                        $q->where('requester_id', $user->id)->orWhere('assigned_to', $user->id);
                    })
                    ->latest()
                    ->limit(5)
                    ->get()
            ),
            'recent_notifications' => $this->formatNotifications(
                Notification::where('user_id', $user->id)->latest()->limit(5)->get()
            ),
            'request_trends' => $this->requestTrends(userId: $user->id),
            'requests_by_status' => $this->requestsByStatus(
                FormRequest::where('user_id', $user->id)
            ),
        ];
    }

    protected function userPayload(User $user): array
    {
        return [
            'role_type' => 'user',
            'title' => 'Welcome, '.explode(' ', $user->name)[0],
            'subtitle' => 'Your personal workspace overview',
            'greeting' => $user->name,
            'department_name' => $user->department?->name,
            'stats' => [
                $this->stat('my_requests', 'My Requests', FormRequest::where('user_id', $user->id)->count(), 'clipboard'),
                $this->stat('drafts', 'Drafts', FormRequest::where('user_id', $user->id)->where('status', RequestStatus::Draft)->count(), 'edit'),
                $this->stat('in_progress', 'In Progress', FormRequest::where('user_id', $user->id)->whereIn('status', [
                    RequestStatus::Submitted->value,
                    RequestStatus::DeptApproved->value,
                    RequestStatus::AtSection->value,
                    RequestStatus::Assigned->value,
                ])->count(), 'clock'),
                $this->stat('approved', 'Approved', FormRequest::where('user_id', $user->id)->where('status', RequestStatus::Approved)->count(), 'check'),
                $this->stat('inter_memos_sent', 'Inter-Memos Sent', InterRequest::where('requester_id', $user->id)->count(), 'arrow'),
                $this->stat('inter_memos_assigned', 'Inter-Memos for Me', InterRequest::where('assigned_to', $user->id)->whereIn('status', [InterRequestStatus::Pending, InterRequestStatus::Processing])->count(), 'inbox'),
                $this->stat('incoming_documents', 'Incoming Mail', $this->incomingDocumentsCount($user->department_id, $user->id), 'file'),
                $this->stat('unread_notifications', 'Unread Alerts', $this->unreadCount($user), 'bell'),
            ],
            'recent_requests' => $this->formatRequests(
                FormRequest::with(['user', 'formTemplate', 'targetDepartment', 'assignedTo'])
                    ->where('user_id', $user->id)
                    ->latest()
                    ->limit(6)
                    ->get()
            ),
            'recent_inter_memos' => $this->formatInterMemos(
                InterRequest::with(['requester', 'assignee'])
                    ->where(function ($q) use ($user) {
                        $q->where('requester_id', $user->id)->orWhere('assigned_to', $user->id);
                    })
                    ->latest()
                    ->limit(5)
                    ->get()
            ),
            'recent_notifications' => $this->formatNotifications(
                Notification::where('user_id', $user->id)->latest()->limit(5)->get()
            ),
            'request_trends' => $this->requestTrends(userId: $user->id),
            'requests_by_status' => $this->requestsByStatus(
                FormRequest::where('user_id', $user->id)
            ),
        ];
    }

    protected function stat(string $key, string $label, int $value, string $icon): array
    {
        return compact('key', 'label', 'value', 'icon');
    }

    protected function unreadCount(User $user): int
    {
        return Notification::where('user_id', $user->id)->whereNull('read_at')->count();
    }

    protected function incomingDocumentsCount(?int $departmentId, ?int $userId = null): int
    {
        if (! $departmentId && ! $userId) {
            return 0;
        }

        return Document::query()
            ->when($userId, fn (Builder $q) => $q->where('uploaded_by', '!=', $userId))
            ->where(function (Builder $q) use ($departmentId, $userId) {
                if ($departmentId) {
                    $q->whereHas(
                        'distributions.recipients',
                        fn (Builder $rq) => $rq->where('department_id', $departmentId)
                    );
                }
                if ($userId) {
                    $q->orWhereHas('userForwards', fn (Builder $fq) => $fq->where('user_id', $userId));
                }
            })
            ->count();
    }

    protected function requestTrends(?int $userId = null, ?int $departmentId = null): array
    {
        $trends = [];

        for ($i = 5; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $start = $date->copy()->startOfMonth();
            $end = $date->copy()->endOfMonth();

            $base = FormRequest::whereBetween('created_at', [$start, $end]);
            if ($userId) {
                $base->where('user_id', $userId);
            }
            if ($departmentId) {
                $base->where('target_department_id', $departmentId);
            }

            $trends[] = [
                'month' => $date->format('M'),
                'submitted' => (clone $base)->where('status', '!=', RequestStatus::Draft->value)->count(),
                'approved' => (clone $base)->where('status', RequestStatus::Approved->value)->count(),
            ];
        }

        return $trends;
    }

    protected function requestsByStatus(Builder $query): array
    {
        return (clone $query)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->orderByDesc('count')
            ->get()
            ->map(function ($row) {
                $status = $row->status instanceof \BackedEnum ? $row->status->value : (string) $row->status;

                return [
                    'name' => ucwords(str_replace('_', ' ', $status)),
                    'value' => (int) $row->count,
                ];
            })
            ->values()
            ->all();
    }

    protected function formatRequests($requests): array
    {
        return $requests->map(fn (FormRequest $req) => [
            'id' => $req->id,
            'reference_no' => $req->reference_no,
            'title' => $req->formTemplate?->title ?? $req->title,
            'status' => $req->status?->value ?? $req->status,
            'requester' => $req->user?->name,
            'department' => $req->targetDepartment?->name,
            'assigned_to' => $req->assignedTo?->name,
            'created_at' => $req->submitted_at ?? $req->created_at,
        ])->values()->all();
    }

    protected function formatInterMemos($memos): array
    {
        return $memos->map(fn (InterRequest $memo) => [
            'id' => $memo->id,
            'reference_no' => $memo->reference_no,
            'subject' => $memo->subject,
            'status' => $memo->status?->value ?? $memo->status,
            'requester' => $memo->requester?->name,
            'assignee' => $memo->assignee?->name,
            'priority' => $memo->priority,
            'created_at' => $memo->created_at,
        ])->values()->all();
    }

    protected function formatNotifications($notifications): array
    {
        return $notifications->map(fn (Notification $n) => [
            'id' => $n->id,
            'title' => $n->title,
            'message' => $n->message,
            'read_at' => $n->read_at,
            'created_at' => $n->created_at,
        ])->values()->all();
    }
}
