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
use App\Http\Controllers\Api\MeetingController;
use App\Http\Controllers\Api\MeetingTemplateController;
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
        Route::post('auth/fcm-token', [AuthController::class, 'updateFcmToken']);

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
        Route::post('form-requests/{form_request}/forward-section', [FormRequestController::class, 'forwardToSection']);
        Route::put('form-requests/{form_request}/cc', [FormRequestController::class, 'syncCcUsers']);
        Route::get('form-requests/{form_request}/cc-candidates', [FormRequestController::class, 'ccCandidates']);
        Route::get('roles-permissions', [RolePermissionController::class, 'index']);
        Route::put('roles/{role}/permissions', [RolePermissionController::class, 'update']);
        Route::post('form-requests/{form_request}/approve', [FormRequestController::class, 'approve']);
        Route::post('form-requests/{form_request}/reject', [FormRequestController::class, 'reject']);
        Route::post('form-requests/{form_request}/return', [FormRequestController::class, 'returnForRevision']);
        Route::post('form-requests/{form_request}/comments', [FormRequestController::class, 'addComment']);
        Route::post('form-requests/{form_request}/attachments', [FormRequestController::class, 'uploadAttachment']);
        Route::get('form-requests/{form_request}/attachments/{attachment}/download', [FormRequestController::class, 'downloadAttachment']);
        Route::delete('form-requests/{form_request}/attachments/{attachment}', [FormRequestController::class, 'deleteAttachment']);

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

        Route::apiResource('meetings', MeetingController::class);
        Route::post('meetings/{meeting}/start', [MeetingController::class, 'startMeeting']);
        Route::post('meetings/{meeting}/end', [MeetingController::class, 'endMeeting']);
        Route::post('meetings/{meeting}/agenda-items', [MeetingController::class, 'addAgendaItems']);
        Route::put('meetings/{meeting}/agenda-items/{agendaItem}', [MeetingController::class, 'updateAgendaItem']);
        Route::delete('meetings/{meeting}/agenda-items/{agendaItem}', [MeetingController::class, 'removeAgendaItem']);
        Route::post('meetings/{meeting}/groups', [MeetingController::class, 'addGroups']);
        Route::delete('meetings/{meeting}/groups/{group}', [MeetingController::class, 'removeGroup']);
        Route::post('meetings/{meeting}/participants', [MeetingController::class, 'addParticipants']);
        Route::delete('meetings/{meeting}/participants/{participant}', [MeetingController::class, 'removeParticipant']);
        Route::put('meetings/{meeting}/speaking-queue', [MeetingController::class, 'updateSpeakingQueue']);
        Route::put('meetings/{meeting}/current-sub-topic', [MeetingController::class, 'updateCurrentSubTopic']);
        Route::put('meetings/{meeting}/speaker-info', [MeetingController::class, 'updateSpeakerInfo']);
        Route::put('meetings/{meeting}/sub-topic-notes', [MeetingController::class, 'updateSubTopicNotes']);
        Route::post('meetings/{meeting}/sub-topic-files', [MeetingController::class, 'uploadSubTopicFile']);
        Route::get('meetings/{meeting}/action-items', [MeetingController::class, 'getActionItems']);
        Route::post('meetings/{meeting}/action-items', [MeetingController::class, 'storeActionItem']);
        Route::delete('meetings/{meeting}/action-items/{item}', [MeetingController::class, 'destroyActionItem']);

        Route::apiResource('meeting-templates', MeetingTemplateController::class);
        Route::post('meetings/{meeting}/rsvp', [MeetingController::class, 'rsvp']);
        Route::post('meetings/{meeting}/checkin', [MeetingController::class, 'checkin']);
        Route::get('my-meetings', [MeetingController::class, 'myMeetings']);
        Route::get('meeting-stats', [MeetingController::class, 'dashboardStats']);
        Route::get('meetings/{meeting}/minutes', [MeetingController::class, 'getMinutes']);
        Route::post('meetings/{meeting}/minutes', [MeetingController::class, 'saveMinute']);

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
