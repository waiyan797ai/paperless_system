<?php

namespace App\Enums;

enum InterRequestStepAction: string
{
    case Submitted = 'submitted';
    case Forwarded = 'forwarded';
    case Approved = 'approved';
}
