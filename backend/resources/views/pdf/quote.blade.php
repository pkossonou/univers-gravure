@php use App\Support\Labels; @endphp
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Devis {{ $quote->number }}</title>@include('pdf._styles')</head>
<body>
<table width="100%">
    <tr>
        <td>
            <img src="{{ public_path('brand/emblem.png') }}" alt="" style="height:46px;vertical-align:middle;margin-right:10px"><span class="brand" style="vertical-align:middle">UNIVERS <span>GRAVURE</span></span>
            <div class="muted">{{ $company['address'] }}<br>{{ $company['phone'] }} {{ $company['email'] }}</div>
        </td>
        <td class="right">
            <p class="h1">DEVIS</p>
            <div class="mono">{{ $quote->number }}</div>
            <div class="muted">Émis le {{ $quote->issued_at?->format('d/m/Y') ?? now()->format('d/m/Y') }}</div>
            @if($quote->valid_until)<div class="muted">Valable jusqu'au {{ $quote->valid_until->format('d/m/Y') }}</div>@endif
        </td>
    </tr>
</table>
<div class="beam"></div>

<table width="100%">
    <tr>
        <td width="50%" class="box">
            <div class="muted" style="font-size:9px;letter-spacing:1px">CLIENT</div>
            <strong>{{ $quote->client->display_name }}</strong><br>
            {{ $quote->client->address }} {{ $quote->client->city }}<br>
            {{ $quote->client->email }} {{ $quote->client->phone }}
        </td>
        <td width="4%"></td>
        <td width="46%" class="box">
            <div class="muted" style="font-size:9px;letter-spacing:1px">PROJET</div>
            @if($quote->project)
                <span class="mono">{{ $quote->project->number }}</span> — {{ Labels::projectType($quote->project->project_type) }}<br>
                {{ $quote->project->title }}
            @else — @endif
        </td>
    </tr>
</table>

<table class="items">
    <thead><tr><th>Désignation</th><th class="right">Qté</th><th class="right">P.U.</th><th class="right">Remise</th><th class="right">Total</th></tr></thead>
    <tbody>
    @foreach($quote->items as $item)
        <tr>
            <td>{{ $item->description }}
                @if(!empty($item->options))<br><span class="muted">@foreach($item->options as $k => $v){{ is_string($k) ? $k.' : ' : '' }}{{ is_array($v) ? implode(', ', $v) : $v }}@if(!$loop->last) · @endif @endforeach</span>@endif
            </td>
            <td class="right mono">{{ $item->quantity }}</td>
            <td class="right mono">{{ number_format($item->unit_price, 0, ',', ' ') }}</td>
            <td class="right mono">{{ $item->discount ? number_format($item->discount, 0, ',', ' ') : '—' }}</td>
            <td class="right mono">{{ number_format($item->total, 0, ',', ' ') }}</td>
        </tr>
    @endforeach
    </tbody>
</table>

<table class="totals">
    <tr><td>Sous-total</td><td class="right mono">{{ Labels::money($quote->subtotal) }}</td></tr>
    @if($quote->discount_amount)<tr><td>Remise</td><td class="right mono">− {{ Labels::money($quote->discount_amount) }}</td></tr>@endif
    @if($quote->tax_amount)<tr><td>TVA ({{ rtrim(rtrim(number_format($quote->tax_rate, 2, ',', ''), '0'), ',') }} %)</td><td class="right mono">{{ Labels::money($quote->tax_amount) }}</td></tr>@endif
    <tr class="grand"><td>Total</td><td class="right mono">{{ Labels::money($quote->total) }}</td></tr>
</table>

@if($quote->notes)<p style="margin-top:24px"><strong>Notes</strong><br>{!! nl2br(e($quote->notes)) !!}</p>@endif
<p class="muted" style="margin-top:16px">{!! nl2br(e($quote->terms ?: "Acompte de 50 % à la validation. Solde à la livraison. Délais indicatifs à compter de la validation du BAT.")) !!}</p>

<div class="footer">UNIVERS GRAVURE — Trophées · Médailles · Gravure · Impression · {{ $company['rccm'] }}</div>
</body>
</html>
