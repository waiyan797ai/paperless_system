<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('form_requests', function (Blueprint $table) {
            $table->foreignId('form_template_id')->nullable()->after('user_id')->constrained('form_templates')->nullOnDelete();
            $table->foreignId('target_department_id')->nullable()->after('form_template_id')->constrained('departments')->nullOnDelete();
            $table->foreignId('assigned_to_id')->nullable()->after('target_department_id')->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_by_id')->nullable()->after('assigned_to_id')->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->nullable()->after('assigned_by_id');

            $table->index('form_template_id');
            $table->index('target_department_id');
            $table->index('assigned_to_id');
        });

        Schema::table('form_requests', function (Blueprint $table) {
            $table->string('type')->nullable()->change();
            $table->string('title')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('form_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('form_template_id');
            $table->dropConstrainedForeignId('target_department_id');
            $table->dropConstrainedForeignId('assigned_to_id');
            $table->dropConstrainedForeignId('assigned_by_id');
            $table->dropColumn('assigned_at');
        });
    }
};
