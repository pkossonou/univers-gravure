@php use App\Support\Labels; @endphp
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Facture {{ $invoice->number }}</title>@include('pdf._styles')</head>
<body>
<table width="100%">
    <tr>
        <td>
            <img src="{{ public_path('brand/emblem.png') }}" alt="" style="height:46px;vertical-align:middle;margin-right:10px"><span class="brand" style="vertical-align:middle">UNIVERS <span>GRAVURE</span></span>
            <div class="muted">{{ $company['address'] }}<br>{{ $company['phone'] }} {{ $company['email'] }}</div>
        </td>
        <td class="right">
            <p class="h1">FACTURE</p>
            <div class="mono">{{ $invoice->number }}</div>
            <div class="muted">Émise le {{ $invoice->issued_at?->format('d/m/Y') ?? '—' }}</div>
            @if($invoice->due_at)<div class="muted">Échéance {{ $invoice->due_at->format('d/m/Y') }}</div>@endif
            <span class="badge">{{ Labels::invoiceStatus($invoice->status) }}</span>
        </td>
    </tr>
</table>
<div class="beam"></div>

<div class="box" style="width:50%">
    <div class="muted" style="font-size:9px;letter-spacing:1px">FACTURÉ À</div>
    <strong>{{ $invoice->client->display_name }}</strong><br>
    {{ $invoice->client->address }} {{ $invoice->client->city }}<br>{{ $invoice->client->email }}
</div>

<table class="items">
    <thead><tr><th>Désignation</th><th class="right">Qté</th><th class="right">P.U.</th><th class="right">Total</th></tr></thead>
    <tbody>
    @foreach($invoice->order?->items ?? [] as $item)
        <tr>
            <td>{{ $item->description }}</td>
            <td class="right mono">{{ $item->quantity }}</td>
            <td class="right mono">{{ number_format($item->unit_price, 0, ',', ' ') }}</td>
            <td class="right mono">{{ number_format($item->total, 0, ',', ' ') }}</td>
        </tr>
    @endforeach
    </tbody>
</table>

<table class="totals">
    <tr><td>Sous-total</td><td class="right mono">{{ Labels::money($invoice->subtotal) }}</td></tr>
    @if($invoice->discount_amount)<tr><td>Remise</td><td class="right mono">− {{ Labels::money($invoice->discount_amount) }}</td></tr>@endif
    @if($invoice->tax_amount)<tr><td>TVA</td><td class="right mono">{{ Labels::money($invoice->tax_amount) }}</td></tr>@endif
    <tr class="grand"><td>Total</td><td class="right mono">{{ Labels::money($invoice->total) }}</td></tr>
    <tr><td>Déjà réglé</td><td class="right mono">{{ Labels::money($invoice->amount_paid) }}</td></tr>
    <tr><td><strong>Reste à payer</strong></td><td class="right mono"><strong>{{ Labels::money($invoice->balance()) }}</strong></td></tr>
</table>

@if($invoice->payments->isNotEmpty())
<p style="margin-top:20px"><strong>Règlements</strong></p>
<table class="items">
    <thead><tr><th>Date</th><th>Mode</th><th>Référence</th><th class="right">Montant</th></tr></thead>
    @foreach($invoice->payments as $p)
        <tr><td>{{ $p->paid_at->format('d/m/Y') }}</td><td>{{ Labels::paymentMethod($p->method) }}</td><td class="mono">{{ $p->reference ?? '—' }}</td><td class="right mono">{{ Labels::money($p->amount) }}</td></tr>
    @endforeach
</table>
@endif

<div class="footer">UNIVERS GRAVURE — {{ $company['rccm'] }}</div>
</body>
</html>
