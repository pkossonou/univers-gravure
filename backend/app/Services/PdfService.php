<?php

namespace App\Services;

use App\Models\DigitalCertificate;
use App\Models\Invoice;
use App\Models\Quote;
use App\Models\Setting;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;

/** Génération des documents PDF (devis, factures, certificats, rapports). */
class PdfService
{
    public function quote(Quote $quote): DomPdf
    {
        $quote->loadMissing('items', 'client', 'project');

        return Pdf::loadView('pdf.quote', ['quote' => $quote, 'company' => $this->company()])->setPaper('a4');
    }

    public function invoice(Invoice $invoice): DomPdf
    {
        $invoice->loadMissing('order.items', 'client', 'payments');

        return Pdf::loadView('pdf.invoice', ['invoice' => $invoice, 'company' => $this->company()])->setPaper('a4');
    }

    public function certificate(DigitalCertificate $certificate): DomPdf
    {
        return Pdf::loadView('pdf.certificate', [
            'cert' => $certificate,
            'qr' => $this->qrDataUri($certificate->verify_url),
            'company' => $this->company(),
        ])->setPaper('a4', 'landscape');
    }

    /** @param array<string, mixed> $report */
    public function report(array $report): DomPdf
    {
        return Pdf::loadView('pdf.report', ['report' => $report, 'company' => $this->company()])->setPaper('a4');
    }

    public function qrSvg(string $content, int $size = 240): string
    {
        $writer = new Writer(new ImageRenderer(new RendererStyle($size, 1), new SvgImageBackEnd));

        return $writer->writeString($content);
    }

    public function qrDataUri(string $content): string
    {
        return 'data:image/svg+xml;base64,'.base64_encode($this->qrSvg($content));
    }

    /** @return array<string, string> */
    private function company(): array
    {
        return [
            'name' => 'UNIVERS GRAVURE',
            'address' => (string) Setting::get('company.address', 'Abidjan, Côte d\'Ivoire'),
            'phone' => (string) Setting::get('company.phone', ''),
            'email' => (string) Setting::get('company.email', ''),
            'rccm' => (string) Setting::get('company.rccm', ''),
        ];
    }
}
