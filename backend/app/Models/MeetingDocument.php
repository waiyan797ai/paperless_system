<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MeetingDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'meeting_id',
        'document_id',
        'agenda_item_id',
        'shared_by',
        'share_timing',
    ];

    public function meeting()
    {
        return $this->belongsTo(Meeting::class);
    }

    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    public function agendaItem()
    {
        return $this->belongsTo(MeetingAgendaItem::class);
    }

    public function sharedBy()
    {
        return $this->belongsTo(User::class, 'shared_by');
    }
}
