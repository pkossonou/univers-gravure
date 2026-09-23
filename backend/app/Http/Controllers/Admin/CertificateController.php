<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\ListsRecords;
use App\Http\Controllers\Controller;
use App\Models\DigitalCertificate;
use App\Models\QrCode;
use App\Services\ActivityLogger;
use App\Services\NumberingService;
use App\Services\PdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CertificateController extends Controller
{
    use ListsRecords;

    public function index(Request $request): JsonResponse
    {
        $this->allow('qr_codes.view');

        return $this->paginated($this->listQuery(
            DigitalCertificate::query()->with(['qrCode:id,code', 'order:id,number']),
            $request, ['issued_on', 'created_at'], ['is_revoked', 'order_id'], ['number', 'recipient_name', 'award_title', 'event_name'],
        ));
    }

    public function store(Request $request, NumberingService $numbering): JsonResponse
    {
        $this->allow('qr_codes.create');
        $data = $request->validate([
            'qr_code_id' => ['nullable', 'exists:qr_codes,id', 'unique:digital_certificates,qr_code_id'],
            'order_id' => ['nullable', 'exists:orders,id'],
            'recipient_name' => ['required_without:qr_code_id', 'nullable', 'string', 'max:190'],
            'award_title' => ['required_without:qr_code_id', 'nullable', 'string', 'max:190'],
            'event_name' => ['nullable', 'string', 'max:190'],
            'organization' => ['nullable', 'string', 'max:190'],
            'issued_on' => ['nullable', 'date'],
        ]);

        // Pré-remplissage depuis le trophée connecté
        if ($qr = isset($data['qr_code_id']) ? QrCode::find($data['qr_code_id']) : null) {
            $data['recipient_name'] ??= $qr->recipient_name ?? $qr->title;
            $data['award_title'] ??= $qr->category_label ?? $qr->title;
            $data['event_name'] ??= $qr->event_name;
            $data['organization'] ??= $qr->organization;
            $data['order_id'] ??= $qr->order_id;
        }

        $cert = new DigitalCertificate($data + [
            'number' => $numbering->next('certificate'),
            'issued_on' => $data['issued_on'] ?? today(),
            'created_by' => auth()->id(),
        ]);
        $cert->verification_hash = $cert->computeHash();
        $cert->save();
        ActivityLogger::log('certificate.issued', $cert);

        return response()->json(['data' => $cert], 201);
    }

    public function revoke(DigitalCertificate $certificate): JsonResponse
    {
        $this->allow('qr_codes.update');
        $certificate->update(['is_revoked' => true]);
        ActivityLogger::log('certificate.revoked', $certificate);

        return response()->json(['data' => $certificate, 'message' => 'Certificat révoqué.']);
    }

    public function pdf(DigitalCertificate $certificate, PdfService $pdf): Response
    {
        $this->allow('qr_codes.view');

        return $pdf->certificate($certificate)->download($certificate->number.'.pdf');
    }
}
