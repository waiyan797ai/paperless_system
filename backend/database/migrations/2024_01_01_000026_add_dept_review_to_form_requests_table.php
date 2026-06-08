<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('form_requests', function (Blueprint $table) {
            $table->foreignId('review_department_id')
                ->nullable()
                ->after('target_department_id')
                ->constrained('departments')
                ->nullOnDelete();
            $table->foreignId('dept_reviewed_by_id')
                ->nullable()
                ->after('review_department_id')
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('dept_reviewed_at')->nullable()->after('dept_reviewed_by_id');
        });
    }

    public function down(): void
    {
        Schema::table('form_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('dept_reviewed_by_id');
            $table->dropConstrainedForeignId('review_department_id');
            $table->dropColumn('dept_reviewed_at');
        });
    }
};
