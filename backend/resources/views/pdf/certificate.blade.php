<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"><title>Certificat {{ $cert->number }}</title>
<style>
    /* A4 paysage = 842 × 595 pt. Dimensions explicites : dompdf gère mal right/bottom en absolu. */
    @page { margin: 0; }
    * { font-family: DejaVu Serif, serif; }
    html, body { margin: 0; padding: 0; background: #0A0A0B; color: #F5F2EB; }
    .frame { position: absolute; top: 24pt; left: 24pt; width: 792pt; height: 545pt; border: 1pt solid #9C7A3C; }
    .inner { position: absolute; top: 32pt; left: 32pt; width: 776pt; height: 529pt; border: 0.6pt solid #3A3A40; }
    .content { position: absolute; top: 52pt; left: 32pt; width: 776pt; text-align: center; }
    .kicker { font-family: DejaVu Sans, sans-serif; font-size: 8.5pt; letter-spacing: 5pt; color: #D4AF6A; }
    .title { font-size: 26pt; margin: 16pt 0 0; letter-spacing: 1pt; }
    .beam { width: 140pt; height: 0.8pt; background: #D4AF6A; margin: 18pt auto; }
    .label { font-family: DejaVu Sans, sans-serif; font-size: 9pt; color: #8B8F98; }
    .name { font-size: 34pt; color: #E6CB8F; margin: 14pt 0 6pt; }
    .award { font-size: 15pt; margin: 4pt 0; }
    .foot { position: absolute; top: 452pt; left: 64pt; width: 712pt; }
    .foot td { font-family: DejaVu Sans, sans-serif; font-size: 7.5pt; color: #8B8F98; vertical-align: bottom; }
    .mono { font-family: DejaVu Sans Mono, monospace; }
    .qr { background: #F5F2EB; padding: 4pt; width: 70pt; height: 70pt; }
</style>
</head>
<body>
<div class="frame"></div>
<div class="inner"></div>
<div class="content">
    <img src="{{ public_path('brand/emblem.png') }}" alt="" style="height:54pt;margin-bottom:10pt"><br>
    <div class="kicker">UNIVERS GRAVURE — CERTIFICAT D'AUTHENTICITÉ</div>
    <div class="title">Récompense officielle</div>
    <div class="beam"></div>
    <div class="label">décernée à</div>
    <div class="name">{{ $cert->recipient_name }}</div>
    <div class="award">{{ $cert->award_title }}</div>
    @if($cert->event_name)<div class="label" style="margin-top:6pt">{{ $cert->event_name }}@if($cert->organization) · {{ $cert->organization }}@endif</div>@endif
    <div class="label" style="margin-top:4pt">Délivré le {{ $cert->issued_on->translatedFormat('d F Y') }}</div>
</div>
<table class="foot" cellspacing="0" cellpadding="0">
    <tr>
        <td style="text-align:left">
            N° <span class="mono">{{ $cert->number }}</span><br>
            Empreinte <span class="mono">{{ substr($cert->verification_hash, 0, 16) }}…</span><br>
            Vérification : {{ $cert->verify_url }}
        </td>
        <td style="text-align:right; width:82pt"><img class="qr" src="{{ $qr }}" alt="QR"></td>
    </tr>
</table>
</body>
</html>
