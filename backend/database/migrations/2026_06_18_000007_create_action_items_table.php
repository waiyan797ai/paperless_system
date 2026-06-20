<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('action_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_id')->constrained('meetings')->onDelete('cascade');
            $table->foreignId('agenda_item_id')->nullable()->constrained('meeting_agenda_items')->onDelete('set null');
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('assignee_id')->constrained('users');
            $table->foreignId('assigner_id')->constrained('users');
            $table->date('due_date')->nullable();
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->enum('status', ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'])->default('pending');
            $table->foreignId('linked_request_id')->nullable()->constrained('form_requests')->onDelete('set null');
            $table->datetime('completed_at')->nullable();
            $table->text('completion_notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('action_items');
    }
};
