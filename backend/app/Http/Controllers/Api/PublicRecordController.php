<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DigitalCertificate;
use App\Models\ProjectFile;
use App\Models\QrCode;
use App\Services\PdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/** Pages publiques des objets connectés (QR trophée), vérification de certificat, fichiers signés. */
class PublicRecordController extends Controller
{
    public function trophy(string $code): JsonResponse
    {
        $qr = QrCode::query()->with('certificate')->where('code', strtoupper($code))
            ->where('is_active', true)->where('is_public', true)->firstOrFail();

        QrCode::whereKey($qr->id)->increment('scans_count', 1, ['last_scanned_at' => now()]);

        return response()->json(['data' => [
            'code' => $qr->code,
            'type' => $qr->type,
            'title' => $qr->title,
            'recipient_name' => $qr->recipient_name,
            'event_name' => $qr->event_name,
            'year' => $qr->year,
            'category_label' => $qr->category_label,
            'organization' => $qr->organization,
            'message' => $qr->message,
            'photo_url' => $qr->photo_url,
            'scans_count' => $qr->scans_count + 1,
            'certificate' => $qr->certificate && ! $qr->certificate->is_revoked
                ? ['number' => $qr->certificate->number, 'verify_url' => $qr->certificate->verify_url] : null,
        ]]);
    }

    public function certificate(string $number): JsonResponse
    {
        $cert = DigitalCertificate::query()->with('qrCode')->where('number', strtoupper($number))->firstOrFail();

        return response()->json(['data' => [
            'number' => $cert->number,
            'recipient_name' => $cert->recipient_name,
            'award_title' => $cert->award_title,
            'event_name' => $cert->event_name,
            'organization' => $cert->organization,
            'issued_on' => $cert->issued_on->toDateString(),
            'is_authentic' => $cert->isAuthentic(),
            'is_revoked' => $cert->is_revoked,
            'trophy_code' => $cert->qrCode?->code,
        ]]);
    }

    public function certificatePdf(string $number, PdfService $pdf): Response
    {
        $cert = DigitalCertificate::query()->where('number', strtoupper($number))->where('is_revoked', false)->firstOrFail();

        return $pdf->certificate($cert)->download($cert->number.'.pdf');
    }

    /** Téléchargement d'un fichier client via URL signée temporaire (middleware « signed »). */
    public function download(Request $request, ProjectFile $file): Response
    {
        abort_unless(Storage::disk($file->disk)->exists($file->path), 404);

        $headers = [
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
        ];

        return $request->boolean('inline') && ($file->isImage() || $file->extension === 'svg' || $file->extension === 'pdf')
            ? Storage::disk($file->disk)->response($file->path, $file->original_name, $headers)
            : Storage::disk($file->disk)->download($file->path, $file->original_name, $headers);
    }
}
