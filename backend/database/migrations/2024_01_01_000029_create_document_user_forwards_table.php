<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_user_forwards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->cascadeOnDelete();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('forwarded_by')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('sent');
            $table->timestamp('viewed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['document_id', 'department_id', 'user_id'], 'doc_user_forwards_unique');
            $table->index('user_id');
            $table->index('department_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_user_forwards');
    }
};
