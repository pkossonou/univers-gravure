<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Services\FinanceService;
use App\Services\PdfService;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function index(): JsonResponse
    {
        $user = auth()->user();
        $available = collect(ReportService::TYPES)->filter(fn ($perm) => $user->can($perm))->keys();

        return response()->json([
            'data' => Report::with('generator:id,name')->whereIn('type', $available)->latest()->limit(30)->get(),
            'available' => $available,
        ]);
    }

    /** Aperçu JSON / export CSV / export PDF. */
    public function generate(Request $request, string $type, ReportService $reports, FinanceService $finance, PdfService $pdf): Response
    {
        abort_unless(isset(ReportService::TYPES[$type]), 404);
        $this->allow(ReportService::TYPES[$type]);

        $request->validate([
            'format' => ['nullable', Rule::in(['json', 'csv', 'pdf'])],
            'period' => ['nullable', Rule::in(FinanceService::PERIODS)],
            'from' => ['required_if:period,custom', 'nullable', 'date'],
            'to' => ['required_if:period,custom', 'nullable', 'date', 'after_or_equal:from'],
        ]);

        try {
            [$from, $to] = $finance->resolvePeriod($request->query('period', 'month'), $request->query('from'), $request->query('to'));
        } catch (InvalidArgumentException $e) {
            abort(422, $e->getMessage());
        }

        $report = $reports->build($type, $from, $to);
        $format = $request->query('format', 'json');

        if ($format !== 'json') {
            Report::create([
                'type' => $type, 'format' => $format, 'period_start' => $from, 'period_end' => $to,
                'parameters' => $request->only(['period', 'from', 'to']), 'generated_by' => auth()->id(),
            ]);
        }

        $filename = sprintf('univers-gravure-%s-%s-%s', $type, $from->format('Ymd'), $to->format('Ymd'));

        return match ($format) {
            'pdf' => $pdf->report($report)->download($filename.'.pdf'),
            'csv' => $this->csv($report, $filename.'.csv'),
            default => response()->json(['data' => $report]),
        };
    }

    /** CSV compatible Excel FR : BOM UTF-8 + séparateur « ; ». */
    private function csv(array $report, string $filename): StreamedResponse
    {
        return response()->streamDownload(function () use ($report) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, [$report['title'], 'Du '.$report['period']['from'].' au '.$report['period']['to']], ';');
            foreach ($report['kpis'] as $kpi) {
                fputcsv($out, [$kpi['label'], $kpi['value']], ';');
            }
            fputcsv($out, [], ';');
            fputcsv($out, $report['columns'], ';');
            foreach ($report['rows'] as $row) {
                // Neutralise l'injection de formules dans Excel
                fputcsv($out, array_map(fn ($c) => is_string($c) && preg_match('/^[=+\-@]/', $c) ? "'".$c : $c, $row), ';');
            }
            foreach ($report['notes'] ?? [] as $note) {
                fputcsv($out, [$note], ';');
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
