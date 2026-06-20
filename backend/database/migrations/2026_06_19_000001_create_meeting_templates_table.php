<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meeting_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('department_id')->nullable()->constrained('departments')->onDelete('set null');
            $table->foreignId('chairperson_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('secretary_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('location')->nullable();
            $table->string('meeting_link')->nullable();
            $table->string('meeting_type')->nullable();
            $table->string('mode')->nullable();
            $table->integer('duration_minutes')->default(60);
            $table->json('groups')->nullable();
            $table->json('participants')->nullable();
            $table->json('agenda_items')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_templates');
    }
};
