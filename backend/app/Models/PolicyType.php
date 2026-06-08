<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PolicyType extends Model
{
    protected $fillable = [
        'code',
        'title',
        'status',
    ];

    public function policies(): HasMany
    {
        return $this->hasMany(Policy::class);
    }
}
