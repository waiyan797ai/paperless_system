<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MeetingMinute extends Model
{
    use HasFactory;

    protected $fillable = [
        'meeting_id',
        'agenda_item_id',
        'content',
        'decisions',
        'recorded_by',
        'is_draft',
        'locked_at',
        'approved_at',
        'approved_by',
    ];

    protected $casts = [
        'is_draft' => 'boolean',
        'locked_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    public function meeting()
    {
        return $this->belongsTo(Meeting::class);
    }

    public function agendaItem()
    {
        return $this->belongsTo(MeetingAgendaItem::class);
    }

    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function isLocked()
    {
        return $this->locked_at !== null;
    }

    public function isApproved()
    {
        return $this->approved_at !== null;
    }
}
