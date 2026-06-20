<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Meeting extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'description',
        'created_by',
        'department_id',
        'chairperson_id',
        'secretary_id',
        'scheduled_at',
        'started_at',
        'ended_at',
        'location',
        'meeting_link',
        'meeting_type',
        'status',
        'mode',
        'is_recurring',
        'recurrence_pattern',
        'minutes_locked',
        'minutes_locked_at',
        'speaking_queue',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'minutes_locked_at' => 'datetime',
        'is_recurring' => 'boolean',
        'minutes_locked' => 'boolean',
        'speaking_queue' => 'array',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function chairperson()
    {
        return $this->belongsTo(User::class, 'chairperson_id');
    }

    public function secretary()
    {
        return $this->belongsTo(User::class, 'secretary_id');
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function participants()
    {
        return $this->hasMany(MeetingParticipant::class);
    }

    public function groups()
    {
        return $this->hasMany(MeetingGroup::class);
    }

    public function agendaItems()
    {
        return $this->hasMany(MeetingAgendaItem::class)->orderBy('order_index');
    }

    public function documents()
    {
        return $this->hasMany(MeetingDocument::class);
    }

    public function minutes()
    {
        return $this->hasMany(MeetingMinute::class);
    }

    public function actionItems()
    {
        return $this->hasMany(ActionItem::class);
    }

    public function personalNotes()
    {
        return $this->hasMany(MeetingPersonalNote::class);
    }

    public function presentUsers()
    {
        return $this->participants()
            ->whereNotNull('checkin_at')
            ->whereIn('attendance_status', ['present', 'late']);
    }

    public function scopeUpcoming($query)
    {
        return $query->where('scheduled_at', '>=', now())
                     ->whereIn('status', ['scheduled', 'ongoing'])
                     ->orderBy('scheduled_at');
    }

    public function scopePast($query)
    {
        return $query->where('scheduled_at', '<', now())
                     ->orWhereIn('status', ['completed', 'cancelled'])
                     ->orderByDesc('scheduled_at');
    }

    public function scopeForUser($query, $userId)
    {
        return $query->whereHas('participants', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        });
    }
}
