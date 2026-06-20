<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Meeting;
use App\Models\MeetingParticipant;
use App\Models\MeetingTemplate;
use App\Models\MeetingGroup;
use App\Models\MeetingAgendaItem;
use App\Models\ActionItem;
use App\Models\MeetingMinute;
use App\Models\MeetingPersonalNote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class MeetingController extends Controller
{
    public function index(Request $request)
    {
        $query = Meeting::with(['creator', 'chairperson', 'secretary', 'department']);

        if ($request->has('status')) {
            $status = $request->status;
            if ($status === 'upcoming') {
                $query->upcoming();
            } else {
                $query->where('status', $status);
            }
        }

        if ($request->has('my_meetings')) {
            $query->forUser(Auth::id());
        }

        if ($request->has('past')) {
            $query->past();
        }

        return response()->json([
            'data' => $query->reorder()->orderByDesc('created_at')->orderByDesc('scheduled_at')->paginate(20)
        ]);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->hasPermission('meetings.create')) {
            return response()->json(['message' => 'Unauthorized. You do not have permission to create meetings.'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'department_id' => 'nullable|exists:departments,id',
            'chairperson_id' => 'nullable|exists:users,id',
            'secretary_id' => 'nullable|exists:users,id',
            'scheduled_at' => 'required|date',
            'location' => 'nullable|string',
            'meeting_link' => 'nullable|string|url',
            'meeting_type' => 'nullable|in:regular,emergency,review,presentation,other',
            'mode' => 'nullable|in:physical,online,hybrid',
            'template_id' => 'nullable|exists:meeting_templates,id',
            'groups' => 'nullable|array',
            'groups.*.name' => 'required_with:groups|string',
            'groups.*.group_type' => 'nullable|in:department,role_based,custom',
            'groups.*.participants' => 'nullable|array',
            'groups.*.participants.*.user_id' => 'required_with:groups.*.participants|exists:users,id',
            'groups.*.participants.*.role' => 'nullable|in:participant,chairperson,secretary,observer,approver',
            'agenda_items' => 'nullable|array',
            'agenda_items.*.title' => 'required_with:agenda_items|string',
            'agenda_items.*.presenter_id' => 'nullable|exists:users,id',
            'agenda_items.*.duration_minutes' => 'nullable|integer|min:1',
        ]);

        $template = null;
        if (!empty($validated['template_id'])) {
            $template = MeetingTemplate::where('is_active', true)
                ->where(function ($q) {
                    $q->where('created_by', Auth::id());
                    if (Auth::user()->hasPermission('meetings.edit')) {
                        $q->orWhere('created_by', '!=', null);
                    }
                })
                ->findOrFail($validated['template_id']);
        }

        $validated['created_by'] = Auth::id();
        $validated['status'] = 'scheduled';

        if ($template) {
            $defaults = [
                'description' => $template->description,
                'department_id' => $template->department_id,
                'chairperson_id' => $template->chairperson_id,
                'secretary_id' => $template->secretary_id,
                'location' => $template->location,
                'meeting_link' => $template->meeting_link,
                'meeting_type' => $template->meeting_type,
                'mode' => $template->mode,
            ];
            foreach ($defaults as $key => $value) {
                if (!isset($validated[$key]) || $validated[$key] === null) {
                    $validated[$key] = $value;
                }
            }
            if (!isset($validated['groups']) && !empty($template->groups)) {
                $validated['groups'] = $template->groups;
            }
            if (!isset($validated['agenda_items']) && !empty($template->agenda_items)) {
                $validated['agenda_items'] = $template->agenda_items;
            }
        }

        DB::beginTransaction();
        try {
            $meeting = Meeting::create($validated);

            $createdGroups = [];
            if (!empty($validated['groups'])) {
                foreach ($validated['groups'] as $index => $group) {
                    $groupData = [
                        'meeting_id' => $meeting->id,
                        'order_index' => $index,
                        'name' => $group['name'] ?? null,
                        'description' => $group['description'] ?? null,
                        'group_type' => $group['group_type'] ?? 'custom',
                    ];
                    $createdGroups[] = MeetingGroup::create($groupData);
                }
            }

            $seenUserIds = [];
            $groupMap = [];
            foreach ($createdGroups as $i => $g) {
                $groupMap[$i] = $g->id;
            }
            foreach ($validated['groups'] ?? [] as $i => $group) {
                foreach ($group['participants'] ?? [] as $participant) {
                    $userId = is_array($participant) ? ($participant['user_id'] ?? null) : $participant;
                    $role = is_array($participant) ? ($participant['role'] ?? 'participant') : 'participant';
                    if (!$userId || in_array($userId, $seenUserIds)) continue;
                    $seenUserIds[] = $userId;
                    MeetingParticipant::firstOrCreate(
                        ['meeting_id' => $meeting->id, 'user_id' => $userId],
                        ['group_id' => $groupMap[$i] ?? null, 'invited_at' => now(), 'rsvp_status' => 'pending', 'attendance_status' => null, 'role' => $role]
                    );
                }
            }

            if (!empty($validated['agenda_items'])) {
                foreach ($validated['agenda_items'] as $index => $item) {
                    $agendaItem = [
                        'meeting_id' => $meeting->id,
                        'order_index' => $index,
                        'title' => $item['title'] ?? ('Agenda Item ' . ($index + 1)),
                        'description' => $item['description'] ?? null,
                        'presenter_id' => $item['presenter_id'] ?? null,
                        'duration_minutes' => $item['duration_minutes'] ?? 15,
                        'speaking_queue' => $item['presenter_id'] ? [
                            ['user_id' => $item['presenter_id'], 'name' => null, 'order' => 1, 'status' => 'queued', 'topic' => null, 'sub_topic' => null, 'description' => null, 'files' => []]
                        ] : [],
                    ];
                    MeetingAgendaItem::create($agendaItem);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Meeting created successfully',
                'data' => $meeting->load(['groups', 'agendaItems', 'participants.user', 'creator'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Meeting creation failed', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Failed to create meeting: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $meeting = Meeting::with([
            'creator',
            'chairperson',
            'secretary',
            'department',
            'groups.participants.user',
            'agendaItems.presenter',
            'agendaItems.minutes.recorder',
            'participants.user',
            'documents.document',
            'actionItems.assignee',
            'minutes.recorder',
        ])->findOrFail($id);

        return response()->json(['data' => $meeting]);
    }

    public function update(Request $request, $id)
    {
        $meeting = Meeting::findOrFail($id);
        if ($error = $this->ensureNotCompleted($meeting)) return $error;
        if (!Auth::user()->hasPermission('meetings.edit') && $meeting->created_by !== Auth::id() && $meeting->chairperson_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'chairperson_id' => 'nullable|exists:users,id',
            'secretary_id' => 'nullable|exists:users,id',
            'scheduled_at' => 'sometimes|date',
            'location' => 'nullable|string',
            'meeting_link' => 'nullable|string|url',
            'meeting_type' => 'nullable|in:regular,emergency,review,presentation,other',
            'mode' => 'nullable|in:physical,online,hybrid',
            'status' => 'nullable|in:draft,scheduled,ongoing,completed,cancelled',
        ]);

        $meeting->update($validated);

        return response()->json([
            'message' => 'Meeting updated successfully',
            'data' => $meeting->fresh()
        ]);
    }

    public function destroy($id)
    {
        $meeting = Meeting::findOrFail($id);
        if (!Auth::user()->hasPermission('meetings.delete') && $meeting->created_by !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }
        $meeting->delete();

        return response()->json(['message' => 'Meeting deleted successfully']);
    }

    public function startMeeting($id)
    {
        $meeting = Meeting::findOrFail($id);
        if (!Auth::user()->hasPermission('meetings.edit') && $meeting->created_by !== Auth::id() && $meeting->chairperson_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $meeting->update([
            'status' => 'ongoing',
            'started_at' => now(),
        ]);

        return response()->json([
            'message' => 'Meeting started',
            'data' => $meeting
        ]);
    }

    public function endMeeting($id)
    {
        $meeting = Meeting::findOrFail($id);
        if (!Auth::user()->hasPermission('meetings.edit') && $meeting->created_by !== Auth::id() && $meeting->chairperson_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $meeting->update([
            'status' => 'completed',
            'ended_at' => now(),
        ]);

        return response()->json([
            'message' => 'Meeting ended',
            'data' => $meeting
        ]);
    }

    public function addParticipants(Request $request, $id)
    {
        $meeting = Meeting::findOrFail($id);
        if ($error = $this->ensureNotCompleted($meeting)) return $error;
        if (!Auth::user()->hasPermission('meetings.manage_participants') && $meeting->created_by !== Auth::id() && $meeting->chairperson_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'participants' => 'required|array',
            'participants.*.user_id' => 'required|exists:users,id',
            'participants.*.group_id' => 'nullable|exists:meeting_groups,id',
            'participants.*.role' => 'nullable|in:chairperson,secretary,participant,observer,approver',
        ]);

        foreach ($validated['participants'] as $participant) {
            $participant['meeting_id'] = $meeting->id;
            MeetingParticipant::create($participant);
        }

        return response()->json([
            'message' => 'Participants added successfully',
            'data' => $meeting->participants()->with('user')->get()
        ]);
    }

    public function rsvp(Request $request, $id)
    {
        $validated = $request->validate([
            'rsvp_status' => 'required|in:accepted,declined,tentative',
            'rsvp_note' => 'nullable|string',
            'delegated_to_id' => 'nullable|exists:users,id',
        ]);

        $participant = MeetingParticipant::where('meeting_id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $participant->update($validated);

        return response()->json([
            'message' => 'RSVP updated',
            'data' => $participant
        ]);
    }

    public function checkin(Request $request, $id)
    {
        $participant = MeetingParticipant::where('meeting_id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $participant->update([
            'checkin_at' => now(),
            'attendance_status' => 'present',
            'checkin_method' => $request->input('method', 'manual'),
        ]);

        return response()->json([
            'message' => 'Checked in successfully',
            'data' => $participant
        ]);
    }

    public function myMeetings(Request $request)
    {
        $query = Meeting::forUser(Auth::id())
            ->with(['chairperson', 'secretary', 'participants']);

        if ($request->has('upcoming')) {
            $query->upcoming();
        } else {
            $query->past();
        }

        return response()->json([
            'data' => $query->orderBy('scheduled_at')->paginate(20)
        ]);
    }

    private function ensureNotCompleted($meeting)
    {
        if (in_array($meeting->status, ['completed', 'cancelled'])) {
            return response()->json(['message' => 'This meeting has been completed and cannot be modified.'], 403);
        }
        return null;
    }

    public function addAgendaItems(Request $request, $id)
    {
        $meeting = Meeting::findOrFail($id);
        if ($error = $this->ensureNotCompleted($meeting)) return $error;
        if (!Auth::user()->hasPermission('meetings.edit') && $meeting->created_by !== Auth::id() && $meeting->chairperson_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'agenda_items' => 'required|array',
            'agenda_items.*.title' => 'required|string',
            'agenda_items.*.description' => 'nullable|string',
            'agenda_items.*.presenter_id' => 'required|exists:users,id',
            'agenda_items.*.duration_minutes' => 'nullable|integer|min:1',
            'agenda_items.*.topic' => 'nullable|string',
            'agenda_items.*.sub_topics' => 'nullable|array',
            'agenda_items.*.sub_topics.*' => 'nullable',
            'agenda_items.*.sub_topics.*.title' => 'required_with:agenda_items.*.sub_topics.*|string',
            'agenda_items.*.sub_topics.*.description' => 'nullable|string',
            'agenda_items.*.sub_topics.*.files' => 'nullable|array',
            'agenda_items.*.sub_topics.*.files.*.name' => 'required|string',
            'agenda_items.*.sub_topics.*.files.*.url' => 'required|string',
            'agenda_items.*.files' => 'nullable|array',
            'agenda_items.*.files.*.name' => 'required|string',
            'agenda_items.*.files.*.url' => 'required|string',
        ]);

        $maxOrder = $meeting->agendaItems()->max('order_index') ?? -1;
        foreach ($validated['agenda_items'] as $index => $item) {
            $item['meeting_id'] = $meeting->id;
            $item['order_index'] = $maxOrder + $index + 1;
            
            $speakingQueue = [];
            if (!empty($item['presenter_id'])) {
                $presenter = $meeting->participants()->where('user_id', $item['presenter_id'])->with('user')->first();
                if ($presenter) {
                    $speakingQueue[] = [
                        'user_id' => $presenter->user_id,
                        'name' => $presenter->user->name,
                        'order' => 1,
                        'status' => 'queued',
                        'topic' => $item['topic'] ?? null,
                        'sub_topics' => $item['sub_topics'] ?? [],
                        'files' => $item['files'] ?? [],
                    ];
                }
            }
            $item['speaking_queue'] = $speakingQueue;
            
            MeetingAgendaItem::create($item);
        }

        return response()->json([
            'message' => 'Agenda items added',
            'data' => $meeting->agendaItems()->with('presenter')->orderBy('order_index')->get()
        ]);
    }

    public function updateAgendaItem(Request $request, $id, $agendaItemId)
    {
        $meeting = Meeting::findOrFail($id);
        if ($error = $this->ensureNotCompleted($meeting)) return $error;
        $agendaItem = MeetingAgendaItem::where('meeting_id', $id)->findOrFail($agendaItemId);

        $isAdmin = Auth::user()->hasPermission('meetings.edit') || $meeting->created_by === Auth::id() || $meeting->chairperson_id === Auth::id();
        $isPresenter = $agendaItem->presenter_id === Auth::id();

        if (!$isAdmin && !$isPresenter) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'title' => 'nullable|string',
            'description' => 'nullable|string',
            'duration_minutes' => 'nullable|integer|min:1',
        ]);

        $agendaItem->update(array_filter($validated, fn($v) => $v !== null));

        return response()->json([
            'message' => 'Agenda item updated',
            'data' => $agendaItem
        ]);
    }

    public function removeAgendaItem($id, $agendaItemId)
    {
        $meeting = Meeting::findOrFail($id);
        if ($error = $this->ensureNotCompleted($meeting)) return $error;
        if (!Auth::user()->hasPermission('meetings.edit') && $meeting->created_by !== Auth::id() && $meeting->chairperson_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $agendaItem = MeetingAgendaItem::where('meeting_id', $id)->findOrFail($agendaItemId);
        $agendaItem->delete();

        return response()->json(['message' => 'Agenda item removed']);
    }

    public function removeGroup($id, $groupId)
    {
        $meeting = Meeting::findOrFail($id);
        if ($error = $this->ensureNotCompleted($meeting)) return $error;
        if (!Auth::user()->hasPermission('meetings.edit') && $meeting->created_by !== Auth::id() && $meeting->chairperson_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $group = MeetingGroup::where('meeting_id', $id)->findOrFail($groupId);
        $group->delete();

        return response()->json(['message' => 'Group removed']);
    }

    public function addGroups(Request $request, $id)
    {
        $meeting = Meeting::findOrFail($id);
        if ($error = $this->ensureNotCompleted($meeting)) return $error;
        if (!Auth::user()->hasPermission('meetings.edit') && $meeting->created_by !== Auth::id() && $meeting->chairperson_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'groups' => 'required|array',
            'groups.*.name' => 'required|string',
            'groups.*.group_type' => 'nullable|in:department,role_based,custom',
            'groups.*.description' => 'nullable|string',
        ]);

        $maxOrder = $meeting->groups()->max('order_index') ?? -1;
        foreach ($validated['groups'] as $index => $group) {
            $group['meeting_id'] = $meeting->id;
            $group['order_index'] = $maxOrder + $index + 1;
            MeetingGroup::create($group);
        }

        return response()->json([
            'message' => 'Groups added',
            'data' => $meeting->groups()->get()
        ]);
    }

    public function removeParticipant($id, $participantId)
    {
        $meeting = Meeting::findOrFail($id);
        if ($error = $this->ensureNotCompleted($meeting)) return $error;
        if (!Auth::user()->hasPermission('meetings.manage_participants') && $meeting->created_by !== Auth::id() && $meeting->chairperson_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $participant = MeetingParticipant::where('meeting_id', $id)->where('id', $participantId)->firstOrFail();
        $participant->delete();

        return response()->json(['message' => 'Participant removed successfully']);
    }

    public function updateSpeakingQueue(Request $request, $id)
    {
        $meeting = Meeting::findOrFail($id);
        if ($error = $this->ensureNotCompleted($meeting)) return $error;
        if (!Auth::user()->hasPermission('meetings.take_minutes') && $meeting->created_by !== Auth::id() && $meeting->secretary_id !== Auth::id() && $meeting->chairperson_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'agenda_item_id' => 'required|exists:meeting_agenda_items,id',
            'speaking_queue' => 'required|array',
            'speaking_queue.*.user_id' => 'required|exists:users,id',
            'speaking_queue.*.order' => 'required|integer|min:0',
            'speaking_queue.*.status' => 'required|in:queued,speaking,completed',
            'speaking_queue.*.notes' => 'nullable|string',
            'speaking_queue.*.started_at' => 'nullable|date',
            'speaking_queue.*.ended_at' => 'nullable|date',
            'speaking_queue.*.topic' => 'nullable|string',
            'speaking_queue.*.sub_topics' => 'nullable|array',
            'speaking_queue.*.sub_topics.*' => 'nullable',
            'speaking_queue.*.sub_topics.*.title' => 'required_with:speaking_queue.*.sub_topics.*|string',
            'speaking_queue.*.sub_topics.*.description' => 'nullable|string',
            'speaking_queue.*.sub_topics.*.files' => 'nullable|array',
            'speaking_queue.*.sub_topics.*.files.*.name' => 'required|string',
            'speaking_queue.*.sub_topics.*.files.*.url' => 'required|string',
            'speaking_queue.*.current_sub_topic_index' => 'nullable|integer|min:0',
            'speaking_queue.*.files' => 'nullable|array',
            'speaking_queue.*.files.*.name' => 'required|string',
            'speaking_queue.*.files.*.url' => 'required|string',
        ]);

        $agendaItem = MeetingAgendaItem::where('meeting_id', $id)->findOrFail($validated['agenda_item_id']);
        $agendaItem->update(['speaking_queue' => $validated['speaking_queue']]);

        return response()->json([
            'message' => 'Speaking queue updated',
            'data' => $agendaItem->speaking_queue
        ]);
    }

    public function updateCurrentSubTopic(Request $request, $id)
    {
        $meeting = Meeting::findOrFail($id);
        if ($error = $this->ensureNotCompleted($meeting)) return $error;

        $validated = $request->validate([
            'agenda_item_id' => 'required|exists:meeting_agenda_items,id',
            'speaker_index' => 'required|integer|min:0',
            'current_sub_topic_index' => 'required|integer|min:0',
        ]);

        $agendaItem = MeetingAgendaItem::where('meeting_id', $id)->findOrFail($validated['agenda_item_id']);
        $queue = $agendaItem->speaking_queue ?? [];
        $speaker = $queue[$validated['speaker_index']] ?? null;

        if (!$speaker) {
            return response()->json(['message' => 'Speaker not found.'], 404);
        }

        // Allow current speaker to update their own sub-topic, or users with take_minutes permission
        $isCurrentSpeaker = $speaker['user_id'] == Auth::id();
        $canManage = Auth::user()->hasPermission('meetings.take_minutes') || $meeting->created_by === Auth::id() || $meeting->secretary_id === Auth::id() || $meeting->chairperson_id === Auth::id();

        if (!$isCurrentSpeaker && !$canManage) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $queue[$validated['speaker_index']]['current_sub_topic_index'] = $validated['current_sub_topic_index'];
        $agendaItem->update(['speaking_queue' => $queue]);

        return response()->json([
            'message' => 'Sub-topic updated',
            'data' => $agendaItem->speaking_queue
        ]);
    }

    public function updateSpeakerInfo(Request $request, $id)
    {
        $meeting = Meeting::findOrFail($id);
        if ($error = $this->ensureNotCompleted($meeting)) return $error;
        $userId = Auth::id();

        $validated = $request->validate([
            'agenda_item_id' => 'required|exists:meeting_agenda_items,id',
            'speaker_index' => 'nullable|integer|min:0',
            'topic' => 'nullable|string',
            'sub_topics' => 'nullable|array',
            'sub_topics.*.title' => 'nullable|string',
            'sub_topics.*.description' => 'nullable|string',
            'sub_topics.*.notes' => 'nullable|string',
            'sub_topics.*.files' => 'nullable|array',
            'sub_topics.*.files.*.name' => 'required_with:sub_topics.*.files|string',
            'sub_topics.*.files.*.url' => 'required_with:sub_topics.*.files|string',
            'sub_topics.*.actions' => 'nullable|array',
            'sub_topics.*.actions.*.user_id' => 'required_with:sub_topics.*.actions|exists:users,id',
            'sub_topics.*.actions.*.start_date' => 'nullable|date',
            'sub_topics.*.actions.*.due_date' => 'nullable|date',
            'sub_topics.*.actions.*.task' => 'nullable|string',
        ]);

        $agendaItem = MeetingAgendaItem::where('meeting_id', $id)->findOrFail($validated['agenda_item_id']);
        $queue = $agendaItem->speaking_queue ?? [];

        $isAdmin = Auth::user()->hasPermission('meetings.take_minutes') || $meeting->created_by === $userId || $meeting->secretary_id === $userId || $meeting->chairperson_id === $userId;
        $speakerIndex = $validated['speaker_index'] ?? null;

        if ($speakerIndex === null) {
            foreach ($queue as $index => $speaker) {
                if ($speaker['user_id'] == $userId) {
                    $speakerIndex = $index;
                    break;
                }
            }
        }

        if ($speakerIndex === null || !isset($queue[$speakerIndex])) {
            return response()->json(['message' => 'Speaker not found in queue.'], 404);
        }

        if ($speakerIndex !== null && $queue[$speakerIndex]['user_id'] != $userId && !$isAdmin) {
            return response()->json(['message' => 'You can only edit your own speaker info.'], 403);
        }

        $queue[$speakerIndex]['topic'] = $validated['topic'] ?? ($queue[$speakerIndex]['topic'] ?? null);
        if (isset($validated['sub_topics'])) {
            $queue[$speakerIndex]['sub_topics'] = array_map(function ($st) {
                return [
                    'title' => $st['title'] ?? null,
                    'description' => $st['description'] ?? null,
                    'notes' => $st['notes'] ?? null,
                    'files' => array_values(array_filter($st['files'] ?? [], fn($f) => !empty($f['name']) && !empty($f['url']))),
                    'actions' => array_values(array_filter($st['actions'] ?? [], fn($a) => !empty($a['user_id']))),
                ];
            }, $validated['sub_topics']);
        }

        $agendaItem->update(['speaking_queue' => $queue]);

        return response()->json([
            'message' => 'Speaker info updated',
            'data' => $queue
        ]);
    }

    public function updateSubTopicNotes(Request $request, $id)
    {
        $meeting = Meeting::findOrFail($id);
        if ($error = $this->ensureNotCompleted($meeting)) return $error;

        $validated = $request->validate([
            'agenda_item_id' => 'required|exists:meeting_agenda_items,id',
            'speaker_index' => 'required|integer|min:0',
            'sub_topic_index' => 'required|integer|min:0',
            'notes' => 'nullable|string',
        ]);

        $agendaItem = MeetingAgendaItem::where('meeting_id', $id)->findOrFail($validated['agenda_item_id']);
        $queue = $agendaItem->speaking_queue ?? [];
        $speaker = $queue[$validated['speaker_index']] ?? null;

        if (!$speaker) {
            return response()->json(['message' => 'Speaker not found.'], 404);
        }

        $isCurrentSpeaker = $speaker['user_id'] == Auth::id();
        $canManage = Auth::user()->hasPermission('meetings.take_minutes') || $meeting->created_by === Auth::id() || $meeting->secretary_id === Auth::id() || $meeting->chairperson_id === Auth::id();

        if (!$isCurrentSpeaker && !$canManage) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $subTopics = $speaker['sub_topics'] ?? [];
        if (!isset($subTopics[$validated['sub_topic_index']])) {
            return response()->json(['message' => 'Sub topic not found.'], 404);
        }

        $subTopics[$validated['sub_topic_index']]['notes'] = $validated['notes'] ?? null;
        $queue[$validated['speaker_index']]['sub_topics'] = $subTopics;

        $agendaItem->update(['speaking_queue' => $queue]);

        return response()->json([
            'message' => 'Notes updated',
            'data' => $agendaItem->speaking_queue
        ]);
    }

    public function uploadSubTopicFile(Request $request, $id)
    {
        $meeting = Meeting::findOrFail($id);
        if ($error = $this->ensureNotCompleted($meeting)) return $error;

        $user = Auth::user();
        $isParticipant = $meeting->participants()->where('user_id', $user->id)->exists();
        $isAdmin = $user->hasPermission('meetings.edit') || $meeting->created_by === $user->id || $meeting->chairperson_id === $user->id || $meeting->secretary_id === $user->id;

        if (!$isParticipant && !$isAdmin) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'file' => 'required|file|mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,txt,zip,jpg,jpeg,png,gif,webp,mp4,mp3,mov,avi|max:51200',
        ]);

        $file = $validated['file'];
        $path = $file->store("meetings/{$id}/sub-topics", 'public');
        $url = Storage::disk('public')->url($path);

        return response()->json([
            'message' => 'File uploaded',
            'data' => [
                'name' => $file->getClientOriginalName(),
                'url' => $url,
                'path' => $path,
            ]
        ]);
    }

    public function getMinutes($id)
    {
        $meeting = Meeting::findOrFail($id);
        $minutes = MeetingMinute::where('meeting_id', $id)
            ->with(['recorder:id,name', 'approver:id,name'])
            ->get();

        return response()->json([
            'data' => $minutes
        ]);
    }

    public function saveMinute(Request $request, $id)
    {
        $meeting = Meeting::findOrFail($id);
        if ($error = $this->ensureNotCompleted($meeting)) return $error;

        $canRecord = Auth::user()->hasPermission('meetings.take_minutes') || $meeting->created_by === Auth::id() || $meeting->secretary_id === Auth::id() || $meeting->chairperson_id === Auth::id();
        if (!$canRecord) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'agenda_item_id' => 'required|exists:meeting_agenda_items,id',
            'content' => 'required|string',
            'decisions' => 'nullable|string',
        ]);

        $agendaItem = MeetingAgendaItem::where('meeting_id', $id)->findOrFail($validated['agenda_item_id']);
        if ($agendaItem->minutes()->whereNotNull('locked_at')->exists()) {
            return response()->json(['message' => 'Minutes for this agenda item are locked.'], 403);
        }

        $minute = MeetingMinute::updateOrCreate(
            [
                'meeting_id' => $id,
                'agenda_item_id' => $validated['agenda_item_id'],
            ],
            [
                'content' => $validated['content'],
                'decisions' => $validated['decisions'] ?? null,
                'recorded_by' => Auth::id(),
                'is_draft' => false,
            ]
        );

        return response()->json([
            'message' => 'Minutes saved',
            'data' => $minute->load(['recorder:id,name'])
        ]);
    }

    public function dashboardStats()
    {
        $userId = Auth::id();

        $upcomingCount = Meeting::forUser($userId)->upcoming()->count();
        $pendingRsvp = MeetingParticipant::where('user_id', $userId)
            ->where('rsvp_status', 'pending')
            ->count();
        $myActionItems = ActionItem::forUser($userId)->pending()->count();

        return response()->json([
            'upcoming_meetings' => $upcomingCount,
            'pending_rsvp' => $pendingRsvp,
            'pending_action_items' => $myActionItems,
        ]);
    }
}
