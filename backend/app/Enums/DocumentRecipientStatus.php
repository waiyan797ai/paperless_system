<?php

namespace App\Enums;

enum DocumentRecipientStatus: string
{
    case Sent = 'sent';
    case Viewed = 'viewed';
    case Acknowledged = 'acknowledged';
}
