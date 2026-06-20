<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meeting_agenda_items', function (Blueprint $table) {
            $table->json('speaking_queue')->nullable()->after('duration_minutes');
        });
    }

    public function down(): void
    {
        Schema::table('meeting_agenda_items', function (Blueprint $table) {
            $table->dropColumn('speaking_queue');
        });
    }
};
