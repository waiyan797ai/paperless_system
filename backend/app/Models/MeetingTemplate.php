<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MeetingTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'created_by',
        'name',
        'description',
        'department_id',
        'chairperson_id',
        'secretary_id',
        'location',
        'meeting_link',
        'meeting_type',
        'mode',
        'duration_minutes',
        'groups',
        'agenda_items',
        'is_active',
    ];

    protected $casts = [
        'groups' => 'array',
        'agenda_items' => 'array',
        'is_active' => 'boolean',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function chairperson()
    {
        return $this->belongsTo(User::class, 'chairperson_id');
    }

    public function secretary()
    {
        return $this->belongsTo(User::class, 'secretary_id');
    }
}
