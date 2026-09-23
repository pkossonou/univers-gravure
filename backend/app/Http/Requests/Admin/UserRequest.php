<?php

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can($this->isMethod('post') ? 'users.create' : 'users.update');
    }

    public function rules(): array
    {
        $id = $this->route('user')?->id;
        // Seul un super administrateur peut attribuer le rôle super_admin
        $roles = $this->user()->hasRole('super_admin') ? User::STAFF_ROLES : array_diff(User::STAFF_ROLES, ['super_admin']);

        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', Rule::unique('users')->ignore($id)],
            'phone' => ['nullable', 'string', 'max:30'],
            'role' => ['required', Rule::in($roles)],
            'is_active' => ['boolean'],
            'password' => [$this->isMethod('post') ? 'required' : 'nullable', Password::min(10)->letters()->numbers()],
        ];
    }
}
