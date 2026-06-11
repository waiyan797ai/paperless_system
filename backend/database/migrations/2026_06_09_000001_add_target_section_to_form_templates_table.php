<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('form_templates', function (Blueprint $table) {
            $table->foreignId('target_section_id')
                ->nullable()
                ->after('target_department_id')
                ->constrained('sections')
                ->nullOnDelete();

            $table->index('target_section_id');
        });
    }

    public function down(): void
    {
        Schema::table('form_templates', function (Blueprint $table) {
            $table->dropConstrainedForeignId('target_section_id');
        });
    }
};
