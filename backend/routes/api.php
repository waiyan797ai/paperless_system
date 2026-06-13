<?php

use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\DocumentTypeController;
use App\Http\Controllers\Api\FormRequestController;
use App\Http\Controllers\Api\FormTemplateController;
use App\Http\Controllers\Api\InterRequestController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PolicyController;
use App\Http\Controllers\Api\PolicyTypeController;
use App\Http\Controllers\Api\RealtimeController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RolePermissionController;
use App\Http\Controllers\Api\SectionController;
use App\Http\Controllers\Api\SystemController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('system/upload-limits', [SystemController::class, 'uploadLimits']);

    Route::post('auth/login', [AuthController::class, 'login']);
    Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::get('realtime/stream', [RealtimeController::class, 'stream']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/profile', [AuthController::class, 'profile']);
        Route::put('auth/profile', [AuthController::class, 'updateProfile']);
        Route::post('auth/profile', [AuthController::class, 'updateProfile']);
        Route::post('auth/change-password', [AuthController::class, 'changePassword']);

        Route::get('dashboard', [DashboardController::class, 'index']);

        Route::apiResource('departments', DepartmentController::class);
        Route::apiResource('sections', SectionController::class);
        Route::apiResource('users', UserController::class);
        Route::apiResource('policy-types', PolicyTypeController::class);
        Route::apiResource('policies', PolicyController::class);
        Route::post('policies/{policy}', [PolicyController::class, 'update']);
        Route::get('policies/{policy}/download', [PolicyController::class, 'download']);

        Route::apiResource('form-templates', FormTemplateController::class);
        Route::get('form-requests/counts', [FormRequestController::class, 'counts']);
        Route::apiResource('form-requests', FormRequestController::class);
        Route::post('form-requests/{form_request}/submit', [FormRequestController::class, 'submit']);
        Route::get('form-requests/{form_request}/assignable-users', [FormRequestController::class, 'assignableUsers']);
        Route::post('form-requests/{form_request}/forward-section', [FormRequestController::class, 'forwardToSection']);
        Route::post('form-requests/{form_request}/assign', [FormRequestController::class, 'assign']);
        Route::put('form-requests/{form_request}/cc', [FormRequestController::class, 'syncCcUsers']);
        Route::get('form-requests/{form_request}/cc-candidates', [FormRequestController::class, 'ccCandidates']);
        Route::get('roles-permissions', [RolePermissionController::class, 'index']);
        Route::put('roles/{role}/permissions', [RolePermissionController::class, 'update']);
        Route::post('form-requests/{form_request}/approve', [FormRequestController::class, 'approve']);
        Route::post('form-requests/{form_request}/reject', [FormRequestController::class, 'reject']);
        Route::post('form-requests/{form_request}/return', [FormRequestController::class, 'returnForRevision']);
        Route::post('form-requests/{form_request}/comments', [FormRequestController::class, 'addComment']);

        Route::get('inter-memos/assignable-users', [InterRequestController::class, 'assignableUsers']);
        Route::apiResource('inter-memos', InterRequestController::class)->parameters([
            'inter-memos' => 'inter_request',
        ]);
        Route::get('inter-memos/{inter_request}/assignable-users', [InterRequestController::class, 'assignableUsers']);
        Route::post('inter-memos/{inter_request}/forward', [InterRequestController::class, 'forward']);
        Route::post('inter-memos/{inter_request}/approve', [InterRequestController::class, 'approve']);
        Route::post('inter-memos/{inter_request}/comments', [InterRequestController::class, 'addComment']);
        Route::post('inter-memos/{inter_request}/attachments', [InterRequestController::class, 'addAttachment']);
        Route::get('inter-memos/{inter_request}/attachments/{attachment}/download', [InterRequestController::class, 'downloadAttachment']);

        Route::apiResource('document-types', DocumentTypeController::class);

        Route::post('documents/distribute', [DocumentController::class, 'storeAndDistribute']);
        Route::get('documents/distributions', [DocumentController::class, 'distributionHistory']);
        Route::get('documents/realtime-version', [RealtimeController::class, 'documentVersion']);
        Route::apiResource('documents', DocumentController::class)->except(['update', 'store']);
        Route::post('documents/{document}/distribute', [DocumentController::class, 'distribute']);
        Route::get('documents/{document}/forwardable-users', [DocumentController::class, 'forwardableUsers']);
        Route::post('documents/{document}/forward', [DocumentController::class, 'forward']);
        Route::post('documents/{document}/view', [DocumentController::class, 'markViewed']);
        Route::post('documents/{document}/acknowledge', [DocumentController::class, 'acknowledge']);
        Route::get('documents/{document}/download', [DocumentController::class, 'download']);
        Route::get('documents/{document}/tracking', [DocumentController::class, 'tracking']);

        Route::get('notifications', [NotificationController::class, 'index']);
        Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead']);
        Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);

        Route::get('audit-logs', [AuditLogController::class, 'index'])
            ->middleware('role:super_admin,admin');

        Route::prefix('reports')->middleware('role:super_admin,admin,manager')->group(function () {
            Route::get('overview', [ReportController::class, 'overview']);
            Route::get('trends', [ReportController::class, 'trends']);
            Route::get('requests', [ReportController::class, 'requests']);
            Route::get('inter-memos', [ReportController::class, 'interRequests']);
            Route::get('documents', [ReportController::class, 'documents']);
            Route::get('users', [ReportController::class, 'users']);
            Route::get('audit', [ReportController::class, 'audit']);
            Route::get('export', [ReportController::class, 'export']);
        });
    });
});
