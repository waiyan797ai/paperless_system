<?php

namespace App\Providers;

use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\FormRequest;
use App\Models\FormTemplate;
use App\Models\InterRequest;
use App\Models\Policy;
use App\Models\PolicyType;
use App\Models\Section;
use App\Models\User;
use App\Policies\AuditLogPolicy;
use App\Policies\DepartmentPolicy;
use App\Policies\DocumentPolicy;
use App\Policies\DocumentTypePolicy;
use App\Policies\FormRequestPolicy;
use App\Policies\FormTemplatePolicy;
use App\Policies\InterRequestPolicy;
use App\Policies\PolicyPolicy;
use App\Policies\PolicyTypePolicy;
use App\Policies\SectionPolicy;
use App\Policies\UserPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    protected array $policies = [
        FormRequest::class => FormRequestPolicy::class,
        InterRequest::class => InterRequestPolicy::class,
        Document::class => DocumentPolicy::class,
        Department::class => DepartmentPolicy::class,
        User::class => UserPolicy::class,
        AuditLog::class => AuditLogPolicy::class,
        Section::class => SectionPolicy::class,
        FormTemplate::class => FormTemplatePolicy::class,
        DocumentType::class => DocumentTypePolicy::class,
        Policy::class => PolicyPolicy::class,
        PolicyType::class => PolicyTypePolicy::class,
    ];

    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        foreach ($this->policies as $model => $policy) {
            Gate::policy($model, $policy);
        }
    }
}
