<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sections', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code');
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('sections')->nullOnDelete();
            $table->unsignedBigInteger('head_id')->nullable();
            $table->text('description')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique(['department_id', 'code']);
            $table->index('parent_id');
            $table->index('head_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sections');
    }
};
