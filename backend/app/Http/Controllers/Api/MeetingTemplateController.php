<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MeetingTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MeetingTemplateController extends Controller
{
    public function index(Request $request)
    {
        $query = MeetingTemplate::with(['creator', 'department', 'chairperson', 'secretary'])
            ->where('is_active', true);

        if (!Auth::user()->hasPermission('meetings.edit')) {
            $query->where('created_by', Auth::id());
        }

        return response()->json([
            'data' => $query->orderBy('name')->get()
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->hasPermission('meetings.create')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'department_id' => 'nullable|exists:departments,id',
            'chairperson_id' => 'nullable|exists:users,id',
            'secretary_id' => 'nullable|exists:users,id',
            'location' => 'nullable|string',
            'meeting_link' => 'nullable|string',
            'meeting_type' => 'nullable|string',
            'mode' => 'nullable|string',
            'duration_minutes' => 'nullable|integer|min:1',
            'groups' => 'nullable|array',
            'groups.*.name' => 'required_with:groups|string',
            'groups.*.group_type' => 'nullable|in:department,role_based,custom',
            'groups.*.participants' => 'nullable|array',
            'groups.*.participants.*.user_id' => 'required|exists:users,id',
            'groups.*.participants.*.role' => 'nullable|in:participant,chairperson,secretary,observer,approver',
            'agenda_items' => 'nullable|array',
            'agenda_items.*.title' => 'required_with:agenda_items|string',
            'agenda_items.*.presenter_id' => 'nullable|exists:users,id',
            'agenda_items.*.duration_minutes' => 'nullable|integer|min:1',
        ]);

        $validated['created_by'] = Auth::id();
        $template = MeetingTemplate::create($validated);

        return response()->json([
            'message' => 'Meeting template created',
            'data' => $template->load(['department', 'chairperson', 'secretary'])
        ], 201);
    }

    public function show($id)
    {
        $template = MeetingTemplate::with(['creator', 'department', 'chairperson', 'secretary'])->findOrFail($id);

        if ($template->created_by !== Auth::id() && !Auth::user()->hasPermission('meetings.edit')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return response()->json(['data' => $template]);
    }

    public function update(Request $request, $id)
    {
        $template = MeetingTemplate::findOrFail($id);

        if ($template->created_by !== Auth::id() && !Auth::user()->hasPermission('meetings.edit')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'department_id' => 'nullable|exists:departments,id',
            'chairperson_id' => 'nullable|exists:users,id',
            'secretary_id' => 'nullable|exists:users,id',
            'location' => 'nullable|string',
            'meeting_link' => 'nullable|string',
            'meeting_type' => 'nullable|string',
            'mode' => 'nullable|string',
            'duration_minutes' => 'nullable|integer|min:1',
            'groups' => 'nullable|array',
            'groups.*.name' => 'required_with:groups|string',
            'groups.*.group_type' => 'nullable|in:department,role_based,custom',
            'groups.*.participants' => 'nullable|array',
            'groups.*.participants.*.user_id' => 'required|exists:users,id',
            'groups.*.participants.*.role' => 'nullable|in:participant,chairperson,secretary,observer,approver',
            'agenda_items' => 'nullable|array',
            'agenda_items.*.title' => 'required_with:agenda_items|string',
            'agenda_items.*.presenter_id' => 'nullable|exists:users,id',
            'agenda_items.*.duration_minutes' => 'nullable|integer|min:1',
            'is_active' => 'nullable|boolean',
        ]);

        $template->update(array_filter($validated, fn($v) => $v !== null));

        return response()->json([
            'message' => 'Meeting template updated',
            'data' => $template->load(['department', 'chairperson', 'secretary'])
        ]);
    }

    public function destroy($id)
    {
        $template = MeetingTemplate::findOrFail($id);

        if ($template->created_by !== Auth::id() && !Auth::user()->hasPermission('meetings.edit')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $template->update(['is_active' => false]);

        return response()->json(['message' => 'Meeting template deleted']);
    }
}
