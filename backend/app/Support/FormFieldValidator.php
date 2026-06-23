<?php

namespace App\Support;

use Illuminate\Validation\Validator;

class FormFieldValidator
{
    public static function validateData(array $fields, array $data, Validator $validator, string $prefix = 'data'): void
    {
        foreach ($fields as $field) {
            $name = $field['name'] ?? null;

            if (! $name) {
                continue;
            }

            $value = $data[$name] ?? null;
            $type = $field['type'] ?? 'text';

            if ($type === 'items') {
                self::validateItemsField($field, $value, $validator, "{$prefix}.{$name}");

                continue;
            }

            // Attachment fields are uploaded via the attachment API, not via form data
            if ($type === 'attachment') {
                continue;
            }

            if (($field['required'] ?? false) && ($value === null || $value === '')) {
                $validator->errors()->add("{$prefix}.{$name}", ($field['label'] ?? $name).' is required.');
            }
        }
    }

    public static function validateTemplateFields(array $fields, Validator $validator): void
    {
        foreach ($fields as $index => $field) {
            $type = $field['type'] ?? 'text';

            if ($type !== 'items') {
                continue;
            }

            $columns = $field['columns'] ?? [];

            if (count($columns) < 1) {
                $validator->errors()->add(
                    "fields.{$index}.columns",
                    ($field['label'] ?? 'Item field').' must have at least one column.'
                );
            }
        }
    }

    private static function validateItemsField(array $field, mixed $value, Validator $validator, string $key): void
    {
        $columns = $field['columns'] ?? [];
        $rows = is_array($value) ? array_values($value) : [];

        if (($field['required'] ?? false) && count($rows) === 0) {
            $validator->errors()->add($key, ($field['label'] ?? $field['name']).' must have at least one item.');

            return;
        }

        foreach ($rows as $index => $row) {
            if (! is_array($row)) {
                continue;
            }

            foreach ($columns as $col) {
                $colName = $col['name'] ?? null;

                if (! $colName) {
                    continue;
                }

                $colValue = $row[$colName] ?? null;

                if (($col['required'] ?? false) && ($colValue === null || $colValue === '')) {
                    $validator->errors()->add(
                        "{$key}.{$index}.{$colName}",
                        ($col['label'] ?? $colName).' is required in item '.($index + 1).'.'
                    );
                }
            }
        }
    }
}
