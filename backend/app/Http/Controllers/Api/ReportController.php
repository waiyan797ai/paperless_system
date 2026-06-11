<?php

namespace App\Http\Controllers\Api;

use App\Enums\InterRequestStatus;
use App\Enums\RequestStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Document;
use App\Models\FormRequest;
use App\Models\InterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function requests(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $query = FormRequest::query();

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('department_id')) {
            $query->whereHas('user', fn ($q) => $q->where('department_id', $request->department_id));
        }

        $summary = [
            'total' => (clone $query)->count(),
            'by_status' => (clone $query)->select('status', DB::raw('count(*) as count'))
                ->groupBy('status')->pluck('count', 'status'),
            'by_type' => (clone $query)->select('type', DB::raw('count(*) as count'))
                ->groupBy('type')->pluck('count', 'type'),
            'records' => $query->with('user.department')->latest()->paginate($request->integer('per_page', 50)),
        ];

        return response()->json(['data' => $summary]);
    }

    public function interRequests(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $query = InterRequest::query();

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $summary = [
            'total' => (clone $query)->count(),
            'by_status' => (clone $query)->select('status', DB::raw('count(*) as count'))
                ->groupBy('status')->pluck('count', 'status'),
            'by_department' => InterRequest::select('to_department_id', DB::raw('count(*) as count'))
                ->groupBy('to_department_id')
                ->with('toDepartment:id,name')
                ->get(),
            'records' => $query->with(['requester', 'fromDepartment', 'toDepartment'])->latest()
                ->paginate($request->integer('per_page', 50)),
        ];

        return response()->json(['data' => $summary]);
    }

    public function documents(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $query = Document::query();

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $summary = [
            'total' => (clone $query)->count(),
            'by_category' => (clone $query)->select('category', DB::raw('count(*) as count'))
                ->groupBy('category')->pluck('count', 'category'),
            'distribution_stats' => DB::table('document_department_recipients')
                ->select('status', DB::raw('count(*) as count'))
                ->groupBy('status')->pluck('count', 'status'),
            'records' => $query->with('uploader')->latest()->paginate($request->integer('per_page', 50)),
        ];

        return response()->json(['data' => $summary]);
    }

    public function users(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $summary = [
            'total' => User::count(),
            'by_role' => User::join('roles', 'users.role_id', '=', 'roles.id')
                ->select('roles.display_name as role', DB::raw('count(*) as count'))
                ->groupBy('roles.display_name', 'roles.id')
                ->pluck('count', 'role'),
            'by_department' => User::query()
                ->select('department_id', DB::raw('count(*) as count'))
                ->groupBy('department_id')
                ->get()
                ->map(fn ($row) => [
                    'department' => Department::find($row->department_id)?->only(['id', 'name']),
                    'count' => $row->count,
                ]),
            'by_status' => User::select('status', DB::raw('count(*) as count'))
                ->groupBy('status')->pluck('count', 'status'),
        ];

        return response()->json(['data' => $summary]);
    }

    public function audit(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $query = AuditLog::with('user');

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        $summary = [
            'total' => (clone $query)->count(),
            'by_action' => (clone $query)->select('action', DB::raw('count(*) as count'))
                ->groupBy('action')->pluck('count', 'action'),
            'records' => $query->latest()->paginate($request->integer('per_page', 50)),
        ];

        return response()->json(['data' => $summary]);
    }

    public function overview(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        return response()->json([
            'data' => [
                'users' => User::count(),
                'departments' => Department::count(),
                'pending_requests' => FormRequest::where('status', RequestStatus::Pending)->count(),
                'pending_inter_requests' => InterRequest::where('status', InterRequestStatus::Pending)->count(),
                'documents' => Document::count(),
                'audit_logs_today' => AuditLog::whereDate('created_at', today())->count(),
            ],
        ]);
    }

    protected function authorizeAdmin(Request $request): void
    {
        if (! $request->user()->hasRole(UserRole::SuperAdmin, UserRole::Admin, UserRole::Manager)) {
            abort(403, 'Unauthorized to view reports.');
        }
    }
}
