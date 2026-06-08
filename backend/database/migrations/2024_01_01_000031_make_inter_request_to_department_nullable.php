<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inter_requests', function (Blueprint $table) {
            $table->dropForeign(['to_department_id']);
            $table->foreignId('to_department_id')->nullable()->change();
            $table->foreign('to_department_id')->references('id')->on('departments')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('inter_requests', function (Blueprint $table) {
            $table->dropForeign(['to_department_id']);
            $table->foreignId('to_department_id')->nullable(false)->change();
            $table->foreign('to_department_id')->references('id')->on('departments')->cascadeOnDelete();
        });
    }
};
