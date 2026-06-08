<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('form_requests', function (Blueprint $table) {
            $table->foreignId('target_section_id')->nullable()->after('target_department_id')->constrained('sections')->nullOnDelete();
            $table->foreignId('final_approved_by_id')->nullable()->after('assigned_at')->constrained('users')->nullOnDelete();
            $table->timestamp('final_approved_at')->nullable()->after('final_approved_by_id');

            $table->index('target_section_id');
        });

        Schema::create('form_request_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('action');
            $table->string('from_status')->nullable();
            $table->string('to_status')->nullable();
            $table->foreignId('assigned_to_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('target_section_id')->nullable()->constrained('sections')->nullOnDelete();
            $table->text('remark')->nullable();
            $table->timestamps();

            $table->index(['form_request_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_request_actions');

        Schema::table('form_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('target_section_id');
            $table->dropConstrainedForeignId('final_approved_by_id');
            $table->dropColumn('final_approved_at');
        });
    }
};
