<?php

namespace App\Enums;

enum NotificationType: string
{
    case Request = 'request';
    case Approval = 'approval';
    case Document = 'document';
    case InterRequest = 'inter_request';
    case System = 'system';
}
