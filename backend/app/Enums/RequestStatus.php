<?php

namespace App\Enums;

enum RequestStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';
    case DeptApproved = 'dept_approved';
    case AtSection = 'at_section';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Returned = 'returned';
    case Completed = 'completed';

    public function isEditable(): bool
    {
        return in_array($this, [self::Draft, self::Returned], true);
    }

    public function isSubmittable(): bool
    {
        return in_array($this, [self::Draft, self::Returned], true);
    }
}
