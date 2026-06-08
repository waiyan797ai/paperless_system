<?php

namespace App\Enums;

enum RequestType: string
{
    case Leave = 'leave';
    case Travel = 'travel';
    case Purchase = 'purchase';
    case General = 'general';
}
