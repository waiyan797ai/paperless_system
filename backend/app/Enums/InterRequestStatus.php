<?php

namespace App\Enums;

enum InterRequestStatus: string
{
    case Pending = 'pending';
    case Processing = 'processing';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Completed = 'completed';
}
