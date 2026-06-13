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

    public function trends(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $months = (int) $request->input('months', 6);
        $trends = [];

        for ($i = $months - 1; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $start = $date->copy()->startOfMonth();
            $end = $date->copy()->endOfMonth();

            $trends[] = [
                'month' => $date->format('M Y'),
                'requests' => [
                    'total' => FormRequest::whereBetween('created_at', [$start, $end])->count(),
                    'approved' => FormRequest::whereBetween('created_at', [$start, $end])
                        ->where('status', RequestStatus::Approved)->count(),
                    'rejected' => FormRequest::whereBetween('created_at', [$start, $end])
                        ->where('status', RequestStatus::Rejected)->count(),
                    'pending' => FormRequest::whereBetween('created_at', [$start, $end])
                        ->where('status', RequestStatus::Pending)->count(),
                ],
                'documents' => Document::whereBetween('created_at', [$start, $end])->count(),
                'users' => User::whereBetween('created_at', [$start, $end])->count(),
                'inter_memos' => InterRequest::whereBetween('created_at', [$start, $end])->count(),
            ];
        }

        return response()->json(['data' => $trends]);
    }

    public function export(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $this->authorizeAdmin($request);

        $type = $request->input('type', 'requests');
        $format = $request->input('format', 'csv');

        $filename = match ($type) {
            'requests' => $this->exportRequests($request),
            'inter-memos' => $this->exportInterRequests($request),
            'documents' => $this->exportDocuments($request),
            'users' => $this->exportUsers($request),
            'audit' => $this->exportAudit($request),
            default => abort(400, 'Invalid report type'),
        };

        return response()->download($filename)->deleteFileAfterSend(true);
    }

    protected function exportRequests(Request $request): string
    {
        $query = FormRequest::with(['user', 'formTemplate', 'targetDepartment']);

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $requests = $query->get();

        $filename = storage_path('app/temp/requests_export_'.time().'.csv');
        $file = fopen($filename, 'w');

        fputcsv($file, ['ID', 'Reference No', 'Title', 'Status', 'Requester', 'Department', 'Created At']);

        foreach ($requests as $req) {
            fputcsv($file, [
                $req->id,
                $req->reference_no,
                $req->formTemplate?->title ?? $req->title,
                $req->status?->value ?? $req->status,
                $req->user?->name,
                $req->targetDepartment?->name,
                $req->created_at->format('Y-m-d H:i:s'),
            ]);
        }

        fclose($file);

        return $filename;
    }

    protected function exportInterRequests(Request $request): string
    {
        $query = InterRequest::with(['requester', 'fromDepartment', 'toDepartment']);

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $requests = $query->get();

        $filename = storage_path('app/temp/inter_memos_export_'.time().'.csv');
        $file = fopen($filename, 'w');

        fputcsv($file, ['ID', 'Reference No', 'Subject', 'Status', 'Requester', 'From Dept', 'To Dept', 'Created At']);

        foreach ($requests as $req) {
            fputcsv($file, [
                $req->id,
                $req->reference_no,
                $req->subject,
                $req->status?->value ?? $req->status,
                $req->requester?->name,
                $req->fromDepartment?->name,
                $req->toDepartment?->name,
                $req->created_at->format('Y-m-d H:i:s'),
            ]);
        }

        fclose($file);

        return $filename;
    }

    protected function exportDocuments(Request $request): string
    {
        $query = Document::with('uploader');

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $documents = $query->get();

        $filename = storage_path('app/temp/documents_export_'.time().'.csv');
        $file = fopen($filename, 'w');

        fputcsv($file, ['ID', 'File Name', 'Category', 'Uploaded By', 'Created At']);

        foreach ($documents as $doc) {
            fputcsv($file, [
                $doc->id,
                $doc->file_name,
                $doc->category,
                $doc->uploader?->name,
                $doc->created_at->format('Y-m-d H:i:s'),
            ]);
        }

        fclose($file);

        return $filename;
    }

    protected function exportUsers(Request $request): string
    {
        $users = User::with(['role', 'department'])->get();

        $filename = storage_path('app/temp/users_export_'.time().'.csv');
        $file = fopen($filename, 'w');

        fputcsv($file, ['ID', 'Name', 'Email', 'Role', 'Department', 'Status', 'Created At']);

        foreach ($users as $user) {
            fputcsv($file, [
                $user->id,
                $user->name,
                $user->email,
                $user->role?->display_name ?? $user->role,
                $user->department?->name,
                $user->status,
                $user->created_at->format('Y-m-d H:i:s'),
            ]);
        }

        fclose($file);

        return $filename;
    }

    protected function exportAudit(Request $request): string
    {
        $query = AuditLog::with('user');

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $logs = $query->get();

        $filename = storage_path('app/temp/audit_export_'.time().'.csv');
        $file = fopen($filename, 'w');

        fputcsv($file, ['ID', 'Action', 'User', 'Entity Type', 'Entity ID', 'IP Address', 'Created At']);

        foreach ($logs as $log) {
            fputcsv($file, [
                $log->id,
                $log->action?->value ?? $log->action,
                $log->user?->name,
                $log->auditable_type,
                $log->auditable_id,
                $log->ip_address,
                $log->created_at->format('Y-m-d H:i:s'),
            ]);
        }

        fclose($file);

        return $filename;
    }

    protected function authorizeAdmin(Request $request): void
    {
        if (! $request->user()->hasRole(UserRole::SuperAdmin, UserRole::Admin, UserRole::Manager)) {
            abort(403, 'Unauthorized to view reports.');
        }
    }
}
