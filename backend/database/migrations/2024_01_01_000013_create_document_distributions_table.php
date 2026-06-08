<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_distributions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->cascadeOnDelete();
            $table->foreignId('distributed_by')->constrained('users')->cascadeOnDelete();
            $table->text('notes')->nullable();
            $table->timestamp('distributed_at')->useCurrent();
            $table->timestamps();

            $table->index('document_id');
            $table->index('distributed_by');
            $table->index('distributed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_distributions');
    }
};
