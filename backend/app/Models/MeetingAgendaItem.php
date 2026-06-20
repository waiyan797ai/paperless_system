<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MeetingAgendaItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'meeting_id',
        'parent_id',
        'title',
        'description',
        'presenter_id',
        'presenter_group_id',
        'duration_minutes',
        'speaking_queue',
        'order_index',
        'status',
        'decisions',
        'notes',
    ];

    protected $casts = [
        'speaking_queue' => 'array',
    ];

    public function meeting()
    {
        return $this->belongsTo(Meeting::class);
    }

    public function presenter()
    {
        return $this->belongsTo(User::class, 'presenter_id');
    }

    public function presenterGroup()
    {
        return $this->belongsTo(MeetingGroup::class, 'presenter_group_id');
    }

    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('order_index');
    }

    public function documents()
    {
        return $this->hasMany(MeetingDocument::class, 'agenda_item_id');
    }

    public function minutes()
    {
        return $this->hasMany(MeetingMinute::class, 'agenda_item_id');
    }

    public function actionItems()
    {
        return $this->hasMany(ActionItem::class);
    }
}
