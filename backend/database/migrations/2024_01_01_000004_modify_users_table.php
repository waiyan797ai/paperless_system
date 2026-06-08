<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('employee_id')->nullable()->unique()->after('id');
            $table->string('phone')->nullable()->after('email');
            $table->foreignId('department_id')->nullable()->after('phone')->constrained()->nullOnDelete();
            $table->foreignId('section_id')->nullable()->after('department_id')->constrained()->nullOnDelete();
            $table->string('position')->nullable()->after('section_id');
            $table->unsignedBigInteger('approver_id')->nullable()->after('position');
            $table->foreignId('role_id')->nullable()->after('approver_id')->constrained()->nullOnDelete();
            $table->string('status')->default('active')->after('role_id');
            $table->string('avatar')->nullable()->after('status');

            $table->index('department_id');
            $table->index('section_id');
            $table->index('approver_id');
            $table->index('role_id');
            $table->index('status');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('approver_id')->references('id')->on('users')->nullOnDelete();
        });

        Schema::table('departments', function (Blueprint $table) {
            $table->foreign('head_id')->references('id')->on('users')->nullOnDelete();
        });

        Schema::table('sections', function (Blueprint $table) {
            $table->foreign('head_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sections', function (Blueprint $table) {
            $table->dropForeign(['head_id']);
        });

        Schema::table('departments', function (Blueprint $table) {
            $table->dropForeign(['head_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['approver_id']);
            $table->dropForeign(['department_id']);
            $table->dropForeign(['section_id']);
            $table->dropForeign(['role_id']);
            $table->dropColumn([
                'employee_id',
                'phone',
                'department_id',
                'section_id',
                'position',
                'approver_id',
                'role_id',
                'status',
                'avatar',
            ]);
        });
    }
};
