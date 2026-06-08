<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('form_requests', function (Blueprint $table) {
            $table->timestamp('endorsed_by_source_at')->nullable()->after('dept_reviewed_at');
        });
    }

    public function down(): void
    {
        Schema::table('form_requests', function (Blueprint $table) {
            $table->dropColumn('endorsed_by_source_at');
        });
    }
};
