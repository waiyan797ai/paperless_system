<?php

namespace App\Http\Controllers\Api;

use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;

class AuthController extends Controller
{
    public function __construct(protected AuditService $auditService) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::with(['role.permissions', 'department', 'section'])
            ->where('email', $request->email)
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        if ($user->status?->value === 'inactive' || $user->status?->value === 'suspended') {
            return response()->json(['message' => 'Account is not active.'], 403);
        }

        $token = $user->createToken('api-token')->plainTextToken;

        $this->auditService->log(AuditAction::Login, $user, $user);

        $user->setAttribute('permissions', $user->permissionSlugs());

        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->auditService->log(AuditAction::Logout, $request->user(), $request->user());
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $status = Password::sendResetLink($request->only('email'));

        return response()->json([
            'message' => $status === Password::RESET_LINK_SENT
                ? 'Password reset link sent.'
                : 'Unable to send reset link.',
        ], $status === Password::RESET_LINK_SENT ? 200 : 422);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $request->user()->update(['password' => $request->password]);

        return response()->json(['message' => 'Password changed successfully.']);
    }

    public function profile(Request $request): JsonResponse
    {
        return response()->json([
            'user' => tap($request->user()->load(['role.permissions', 'department', 'section', 'approver']), function ($user) {
                $user->setAttribute('permissions', $user->permissionSlugs());
            }),
        ]);
    }

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        if ($request->hasFile('avatar')) {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $data['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        $user->update($data);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $user->fresh(['role', 'department', 'section']),
        ]);
    }
}
