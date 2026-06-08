<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inter_request_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inter_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assigned_to_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->text('remark')->nullable();
            $table->timestamps();

            $table->index('inter_request_id');
            $table->index('user_id');
            $table->index('assigned_to_id');
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inter_request_steps');
    }
};
