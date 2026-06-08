<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('policies', function (Blueprint $table) {
            $table->foreignId('policy_type_id')->nullable()->after('description')->constrained('policy_types')->nullOnDelete();
            $table->foreignId('created_department_id')->nullable()->after('created_by')->constrained('departments')->nullOnDelete();
        });

        Schema::table('policies', function (Blueprint $table) {
            $table->dropIndex(['category']);
            $table->dropColumn('category');
        });
    }

    public function down(): void
    {
        Schema::table('policies', function (Blueprint $table) {
            $table->string('category')->nullable()->after('description');
            $table->index('category');
        });

        Schema::table('policies', function (Blueprint $table) {
            $table->dropConstrainedForeignId('policy_type_id');
            $table->dropConstrainedForeignId('created_department_id');
        });
    }
};
