<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MeetingParticipant extends Model
{
    use HasFactory;

    protected $fillable = [
        'meeting_id',
        'user_id',
        'group_id',
        'role',
        'rsvp_status',
        'rsvp_note',
        'proxy_for_id',
        'delegated_to_id',
        'attendance_type',
        'checkin_at',
        'checkout_at',
        'attendance_status',
        'checkin_method',
        'notified',
        'notified_at',
    ];

    protected $casts = [
        'checkin_at' => 'datetime',
        'checkout_at' => 'datetime',
        'notified_at' => 'datetime',
        'notified' => 'boolean',
    ];

    public function meeting()
    {
        return $this->belongsTo(Meeting::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function group()
    {
        return $this->belongsTo(MeetingGroup::class);
    }

    public function proxyFor()
    {
        return $this->belongsTo(User::class, 'proxy_for_id');
    }

    public function delegatedTo()
    {
        return $this->belongsTo(User::class, 'delegated_to_id');
    }

    public function isPresent()
    {
        return in_array($this->attendance_status, ['present', 'late']) && $this->checkin_at !== null;
    }
}
