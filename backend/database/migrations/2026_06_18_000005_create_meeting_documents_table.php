<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meeting_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_id')->constrained('meetings')->onDelete('cascade');
            $table->foreignId('document_id')->constrained('documents')->onDelete('cascade');
            $table->foreignId('agenda_item_id')->nullable()->constrained('meeting_agenda_items')->onDelete('cascade');
            $table->foreignId('shared_by')->constrained('users');
            $table->enum('share_timing', ['pre_meeting', 'during_meeting', 'post_meeting'])->default('pre_meeting');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_documents');
    }
};
