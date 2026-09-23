<?php

namespace App\Http\Controllers\Admin;

use App\Models\Order;
use App\Models\QrCode;
use App\Services\MediaService;
use App\Services\PdfService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/** Trophées connectés : chaque objet reçoit un QR unique menant à sa page publique. */
class QrCodeController extends CrudController
{
    protected string $model = QrCode::class;

    protected string $permission = 'qr_codes';

    protected array $with = ['order:id,number', 'client:id,company,first_name,last_name', 'certificate:id,qr_code_id,number'];

    protected array $sortable = ['created_at', 'scans_count', 'year', 'title'];

    protected array $filterable = ['type', 'is_active', 'is_public', 'order_id', 'year'];

    protected array $searchable = ['code', 'title', 'recipient_name', 'event_name', 'organization'];

    protected function rules(Request $request, ?Model $record): array
    {
        return [
            'order_id' => ['nullable', 'exists:orders,id'],
            'client_id' => ['nullable', 'exists:clients,id'],
            'type' => ['required', Rule::in(QrCode::TYPES)],
            'title' => ['required', 'string', 'max:190'],
            'recipient_name' => ['nullable', 'string', 'max:190'],
            'event_name' => ['nullable', 'string', 'max:190'],
            'year' => ['nullable', 'integer', 'min:1950', 'max:2100'],
            'category_label' => ['nullable', 'string', 'max:190'],
            'organization' => ['nullable', 'string', 'max:190'],
            'message' => ['nullable', 'string', 'max:2000'],
            'photo' => MediaService::IMAGE_RULES,
            'photo_url' => ['nullable', 'url', 'max:255'],
            'is_public' => ['boolean'],
            'is_active' => ['boolean'],
        ];
    }

    protected function prepare(array $data, ?Model $record): array
    {
        unset($data['photo']);
        if (request()->hasFile('photo')) {
            $media = app(MediaService::class);
            $media->delete($record?->photo_url);
            $data['photo_url'] = $media->store(request()->file('photo'), 'trophees');
        }
        if (! $record) {
            // Code court, sans caractères ambigus (0/O, 1/I)
            do {
                $code = 'UG'.strtoupper(Str::of(Str::random(12))->replaceMatches('/[^A-HJ-NP-Z2-9]/i', '')->substr(0, 6));
            } while (strlen($code) < 8 || QrCode::where('code', $code)->exists());
            $data['code'] = $code;
            $data['created_by'] = auth()->id();
            if (! empty($data['order_id']) && empty($data['client_id'])) {
                $data['client_id'] = Order::find($data['order_id'])?->client_id;
            }
        }

        return $data;
    }

    /** QR code au format SVG, prêt pour la gravure laser. */
    public function svg(int $id, PdfService $pdf): Response
    {
        $this->allow('qr_codes.view');
        $qr = QrCode::findOrFail($id);

        return response($pdf->qrSvg($qr->public_url, 600), 200, [
            'Content-Type' => 'image/svg+xml',
            'Content-Disposition' => 'attachment; filename="'.$qr->code.'.svg"',
        ]);
    }
}
