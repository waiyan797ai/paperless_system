<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meeting_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_id')->constrained('meetings')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('group_id')->nullable()->constrained('meeting_groups')->onDelete('set null');
            $table->enum('role', ['chairperson', 'secretary', 'participant', 'observer', 'approver'])->default('participant');
            $table->enum('rsvp_status', ['pending', 'accepted', 'declined', 'tentative'])->default('pending');
            $table->text('rsvp_note')->nullable();
            $table->foreignId('proxy_for_id')->nullable()->constrained('users');
            $table->foreignId('delegated_to_id')->nullable()->constrained('users');
            $table->enum('attendance_type', ['self', 'proxy'])->default('self');
            $table->datetime('checkin_at')->nullable();
            $table->datetime('checkout_at')->nullable();
            $table->enum('attendance_status', ['present', 'absent', 'late', 'early_leave'])->nullable();
            $table->string('checkin_method')->nullable();
            $table->boolean('notified')->default(false);
            $table->datetime('notified_at')->nullable();
            $table->timestamps();

            $table->unique(['meeting_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_participants');
    }
};
