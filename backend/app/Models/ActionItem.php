<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActionItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'meeting_id',
        'agenda_item_id',
        'title',
        'description',
        'assignee_id',
        'assigner_id',
        'due_date',
        'priority',
        'status',
        'linked_request_id',
        'completed_at',
        'completion_notes',
        'start_date',
    ];

    protected $casts = [
        'due_date' => 'date',
        'start_date' => 'date',
        'completed_at' => 'datetime',
    ];

    public function meeting()
    {
        return $this->belongsTo(Meeting::class);
    }

    public function agendaItem()
    {
        return $this->belongsTo(MeetingAgendaItem::class);
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function assigner()
    {
        return $this->belongsTo(User::class, 'assigner_id');
    }

    public function linkedRequest()
    {
        return $this->belongsTo(FormRequest::class, 'linked_request_id');
    }

    public function isOverdue()
    {
        return $this->due_date && $this->due_date < now()->toDateString() && in_array($this->status, ['pending', 'in_progress']);
    }

    public function scopePending($query)
    {
        return $query->whereIn('status', ['pending', 'in_progress']);
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('assignee_id', $userId);
    }
}
