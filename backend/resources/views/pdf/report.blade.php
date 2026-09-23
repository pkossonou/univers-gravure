<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>{{ $report['title'] }}</title>@include('pdf._styles')</head>
<body>
<table width="100%">
    <tr>
        <td><img src="{{ public_path('brand/emblem.png') }}" alt="" style="height:46px;vertical-align:middle;margin-right:10px"><span class="brand" style="vertical-align:middle">UNIVERS <span>GRAVURE</span></span></td>
        <td class="right">
            <p class="h1">{{ $report['title'] }}</p>
            <div class="muted">Du {{ \Carbon\Carbon::parse($report['period']['from'])->format('d/m/Y') }} au {{ \Carbon\Carbon::parse($report['period']['to'])->format('d/m/Y') }}</div>
            <div class="muted">Généré le {{ now()->format('d/m/Y H:i') }}</div>
        </td>
    </tr>
</table>
<div class="beam"></div>

@if(!empty($report['kpis']))
<table width="100%" style="margin-bottom:14px">
    <tr>
    @foreach($report['kpis'] as $kpi)
        <td class="box" style="width:{{ floor(100 / count($report['kpis'])) }}%">
            <div class="muted" style="font-size:8.5px;letter-spacing:1px;text-transform:uppercase">{{ $kpi['label'] }}</div>
            <div class="mono" style="font-size:13px;font-weight:bold">{{ $kpi['value'] }}</div>
        </td>
    @endforeach
    </tr>
</table>
@endif

@foreach($report['notes'] ?? [] as $note)
    <p class="muted">⚠ {{ $note }}</p>
@endforeach

<table class="items">
    <thead><tr>@foreach($report['columns'] as $col)<th>{{ $col }}</th>@endforeach</tr></thead>
    <tbody>
    @forelse($report['rows'] as $row)
        <tr>@foreach($row as $cell)<td class="{{ is_numeric($cell) ? 'right mono' : '' }}">{{ is_numeric($cell) ? number_format($cell, 0, ',', ' ') : $cell }}</td>@endforeach</tr>
    @empty
        <tr><td colspan="{{ count($report['columns']) }}" class="muted">Aucune donnée sur la période.</td></tr>
    @endforelse
    </tbody>
</table>

<div class="footer">UNIVERS GRAVURE — rapport généré depuis la plateforme, données issues de la base de gestion.</div>
</body>
</html>
