<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\SiteContent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Textes du site : lecture publique, modification par l'équipe (permission settings.manage). */
class ContentController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => SiteContent::all()]);
    }

    public function edit(): JsonResponse
    {
        $this->allow('settings.manage');

        return response()->json([
            'data' => SiteContent::all(),
            'fields' => collect(SiteContent::FIELDS)->map(fn ($f, $key) => [
                'key' => $key,
                'label' => $f['label'],
                'section' => $f['section'],
                'multiline' => $f['multiline'] ?? false,
                'type' => $key === 'faq' ? 'faq' : 'text',
            ])->values(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $this->allow('settings.manage');
        $request->validate([
            'content' => ['required', 'array'],
            'content.faq' => ['sometimes', 'array', 'max:20'],
            'content.faq.*.q' => ['nullable', 'string', 'max:255'],
            'content.faq.*.a' => ['nullable', 'string', 'max:2000'],
            'content.*' => ['nullable'],
        ]);
        foreach ($request->input('content') as $key => $value) {
            if ($key !== 'faq' && is_string($value) && mb_strlen($value) > 1000) {
                return $this->message('Texte trop long : '.$key, 422);
            }
        }
        SiteContent::save($request->input('content'));

        return response()->json(['data' => SiteContent::all(), 'message' => 'Contenus enregistrés. Le site est mis à jour sous une minute.']);
    }
}
