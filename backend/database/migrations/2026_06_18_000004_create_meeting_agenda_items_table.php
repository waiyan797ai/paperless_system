<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meeting_agenda_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_id')->constrained('meetings')->onDelete('cascade');
            $table->foreignId('parent_id')->nullable()->constrained('meeting_agenda_items')->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('presenter_id')->nullable()->constrained('users');
            $table->foreignId('presenter_group_id')->nullable()->constrained('meeting_groups')->onDelete('set null');
            $table->integer('duration_minutes')->default(15);
            $table->integer('order_index')->default(0);
            $table->enum('status', ['pending', 'current', 'completed', 'skipped'])->default('pending');
            $table->text('decisions')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_agenda_items');
    }
};
