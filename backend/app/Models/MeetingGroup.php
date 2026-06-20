<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MeetingGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'meeting_id',
        'name',
        'description',
        'group_type',
        'order_index',
    ];

    public function meeting()
    {
        return $this->belongsTo(Meeting::class);
    }

    public function participants()
    {
        return $this->hasMany(MeetingParticipant::class, 'group_id');
    }

    public function agendaItems()
    {
        return $this->hasMany(MeetingAgendaItem::class, 'presenter_group_id');
    }
}
