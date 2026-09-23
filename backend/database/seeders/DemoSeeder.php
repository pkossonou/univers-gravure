<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\DigitalCertificate;
use App\Models\ExpenseCategory;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Material;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductionOrder;
use App\Models\Project;
use App\Models\Purchase;
use App\Models\QrCode;
use App\Models\Quote;
use App\Models\StockItem;
use App\Models\Supplier;
use App\Models\User;
use App\Services\NumberingService;
use App\Services\PricingService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Jeu de démonstration réaliste et cohérent sur 12 mois (aucune donnée personnelle réelle :
 * noms fictifs, domaines e-mail réservés « .example »).
 * La chaîne demande → devis → commande → production → facture → paiements est respectée.
 */
class DemoSeeder extends Seeder
{
    private NumberingService $numbering;

    private PricingService $pricing;

    private CarbonImmutable $today;

    /** @var array<string, User> */
    private array $staff = [];

    public function run(): void
    {
        mt_srand(2026);
        $this->numbering = app(NumberingService::class);
        $this->pricing = app(PricingService::class);
        $this->today = CarbonImmutable::today();

        DB::transaction(function () {
            $this->users();
            $clients = $this->clients();
            $suppliers = $this->suppliers();
            $this->stock($suppliers);
            $this->history($clients, $suppliers);
            $this->leads();
            $this->connectedObjects();
        });
    }

    private function users(): void
    {
        $password = env('SEED_DEMO_PASSWORD', 'Gravure2026!');
        $team = [
            'super_admin' => ['Direction Univers Gravure', 'direction@universgravure.example'],
            'admin' => ['Awa Kouadio', 'admin@universgravure.example'],
            'commercial' => ['Serge N\'Dri', 'commercial@universgravure.example'],
            'comptabilite' => ['Mariam Touré', 'compta@universgravure.example'],
            'production' => ['Yao Kouassi', 'atelier@universgravure.example'],
            'designer' => ['Affoué Bamba', 'design@universgravure.example'],
        ];
        foreach ($team as $role => [$name, $email]) {
            $user = User::updateOrCreate(['email' => $email], ['name' => $name, 'password' => $password, 'is_active' => true, 'email_verified_at' => now()]);
            $user->syncRoles([$role]);
            $this->staff[$role] = $user;
        }
    }

    /** @return list<Client> */
    private function clients(): array
    {
        $companies = [
            ['Horizon Assurances CI', 'entreprise', 'Plateau'], ['Tech Lagune SARL', 'entreprise', 'Marcory'],
            ['Académie Sportive Lagunaire', 'association', 'Yopougon'], ['Lycée Moderne Les Palmiers', 'etablissement_scolaire', 'Cocody'],
            ['Clinique Sainte-Aurore', 'entreprise', 'Cocody'], ['Cabinet Kanga & Associés', 'entreprise', 'Plateau'],
            ['Club de Tennis de la Riviera', 'association', 'Riviera'], ['Ligue des Jeunes Talents', 'association', 'Abobo'],
            ['Groupe Solaris Énergie', 'entreprise', 'Zone 4'], ['Association des Anciens de Bingerville', 'association', 'Bingerville'],
            ['Brasserie du Littoral', 'entreprise', 'Treichville'], ['Institut Supérieur Kaolin', 'etablissement_scolaire', 'Cocody'],
            ['Orange Lagoon Events', 'entreprise', 'Marcory'], ['Direction Régionale de la Culture (démo)', 'administration', 'Plateau'],
            ['Pharmacie des Deux Plateaux', 'entreprise', 'Deux Plateaux'], ['Hôtel Ivoire Lagune (démo)', 'entreprise', 'Cocody'],
            ['FC Espoirs de Koumassi', 'association', 'Koumassi'], ['Banque Populaire du Sud (démo)', 'entreprise', 'Plateau'],
        ];
        $people = [
            ['Koffi', 'Kouassi'], ['Aya', 'N\'Guessan'], ['Drissa', 'Traoré'], ['Adjoua', 'Koné'], ['Konan', 'Yao'],
            ['Fatou', 'Coulibaly'], ['Kouamé', 'Ouattara'], ['Amenan', 'Diabaté'], ['Ibrahim', 'Bamba'], ['Christelle', 'Aka'],
            ['Jean-Marc', 'Gnagne'], ['Aminata', 'Sylla'],
        ];

        $clients = [];
        foreach ($companies as $i => [$company, $type, $city]) {
            $slug = trim(preg_replace('/[^a-z]+/', '-', strtolower(iconv('UTF-8', 'ASCII//TRANSLIT', $company))), '-');
            $clients[] = Client::create([
                'type' => $type, 'company' => $company,
                'first_name' => $people[$i % count($people)][0], 'last_name' => $people[$i % count($people)][1],
                'email' => 'contact@'.$slug.'.example', 'phone' => sprintf('+225 07 %02d %02d %02d %02d', mt_rand(10, 99), mt_rand(10, 99), mt_rand(10, 99), mt_rand(10, 99)),
                'address' => $city, 'city' => 'Abidjan', 'source' => ['recommandation', 'site_web', 'salon', 'reseaux_sociaux'][mt_rand(0, 3)],
                'created_at' => $this->today->subDays(mt_rand(200, 420)),
            ]);
        }
        foreach ($people as $i => [$first, $last]) {
            $clients[] = Client::create([
                'type' => 'particulier', 'first_name' => $first, 'last_name' => $last,
                'email' => strtolower(iconv('UTF-8', 'ASCII//TRANSLIT', $first.'.'.$last)).'@particulier.example',
                'phone' => sprintf('+225 05 %02d %02d %02d %02d', mt_rand(10, 99), mt_rand(10, 99), mt_rand(10, 99), mt_rand(10, 99)),
                'city' => 'Abidjan', 'source' => 'site_web', 'created_at' => $this->today->subDays(mt_rand(20, 360)),
            ]);
        }

        return $clients;
    }

    /** @return array<string, Supplier> */
    private function suppliers(): array
    {
        $list = [
            'metal' => ['Métaux & Alliages de l\'Ouest (démo)', 'matieres', 'Yopougon zone industrielle'],
            'acrylic' => ['Plexi Distribution CI (démo)', 'matieres', 'Vridi'],
            'print' => ['Encres & Supports Pro (démo)', 'consommables', 'Marcory'],
            'wood' => ['Menuiserie Fine du Banco (démo)', 'sous_traitance', 'Adjamé'],
            'transport' => ['Coursiers Express Lagune (démo)', 'transport', 'Treichville'],
            'import' => ['Trophy Import Europe (démo)', 'import', 'Port-Bouët'],
        ];
        $suppliers = [];
        foreach ($list as $key => [$name, $category, $city]) {
            $s = Supplier::create(['name' => $name, 'category' => $category, 'city' => $city, 'address' => $city.', Abidjan',
                'phone' => '+225 27 '.mt_rand(10, 99).' '.mt_rand(10, 99).' '.mt_rand(10, 99).' '.mt_rand(10, 99),
                'email' => 'commandes@'.$key.'-fournisseur.example', 'is_active' => true]);
            $s->contacts()->create(['name' => ['M. Diallo', 'Mme Kouakou', 'M. Brou', 'Mme Esso', 'M. Kra', 'Mme Loba'][count($suppliers)], 'role' => 'Commercial', 'phone' => $s->phone]);
            $suppliers[$key] = $s;
        }

        return $suppliers;
    }

    /** @param array<string, Supplier> $suppliers */
    private function stock(array $suppliers): void
    {
        $mat = Material::pluck('id', 'slug');
        $items = [
            ['Plaque laiton 1 mm — 30×40', 'MP-LAI-001', 'raw_material', 'feuille', 18, 6, 14500, 'metal', 'laiton'],
            ['Tôle inox brossé 1,5 mm', 'MP-INX-001', 'raw_material', 'feuille', 9, 4, 22000, 'metal', 'acier-inoxydable'],
            ['Plaque aluminium anodisé', 'MP-ALU-001', 'raw_material', 'feuille', 25, 8, 9500, 'metal', 'aluminium-brosse'],
            ['Plexiglas cristal 20 mm', 'MP-PLX-020', 'raw_material', 'feuille', 3, 4, 68000, 'acrylic', 'plexiglas-acrylique'],
            ['Plexiglas 5 mm', 'MP-PLX-005', 'raw_material', 'feuille', 14, 5, 21000, 'acrylic', 'plexiglas-acrylique'],
            ['Bloc cristal optique 200 mm', 'MP-CRI-200', 'raw_material', 'pcs', 12, 5, 19000, 'import', 'cristal-optique'],
            ['Planche acajou 18 mm', 'MP-BOI-018', 'raw_material', 'm2', 6.5, 2, 26000, 'wood', 'bois-noble-acajou'],
            ['Bâche PVC 510 g — rouleau 3,2 m', 'MP-BAC-510', 'raw_material', 'm2', 140, 60, 1900, 'print', 'bache-pvc-510-g'],
            ['Vinyle adhésif blanc', 'MP-VIN-001', 'raw_material', 'm2', 38, 50, 2400, 'print', 'vinyle-adhesif'],
            ['Encre UV — cyan', 'CO-ENC-UVC', 'consumable', 'litre', 2.5, 1, 85000, 'print', null],
            ['Encre UV — blanc', 'CO-ENC-UVW', 'consumable', 'litre', 0.8, 1, 95000, 'print', null],
            ['Rubans médaille tricolores', 'CO-RUB-001', 'consumable', 'pcs', 850, 300, 150, 'import', null],
            ['Coupes métal S (à monter)', 'PR-CUP-S', 'product', 'pcs', 34, 15, 11000, 'import', 'zamak-dore'],
            ['Socles marbre noir', 'PR-SOC-001', 'product', 'pcs', 41, 20, 4500, 'import', null],
            ['Médailles vierges Ø50 or', 'PR-MED-050', 'product', 'pcs', 620, 200, 700, 'import', 'zamak-dore'],
            ['Mugs sublimation blancs', 'PR-MUG-033', 'product', 'pcs', 96, 48, 1100, 'print', null],
        ];
        foreach ($items as [$name, $sku, $type, $unit, $qty, $alert, $cost, $sup, $material]) {
            $item = StockItem::create([
                'name' => $name, 'sku' => $sku, 'type' => $type, 'unit' => $unit, 'quantity' => $qty,
                'alert_threshold' => $alert, 'unit_cost' => $cost, 'supplier_id' => $suppliers[$sup]->id,
                'material_id' => $material ? $mat[$material] : null, 'location' => $type === 'product' ? 'Réserve A' : 'Atelier',
                'is_active' => true,
            ]);
            $item->movements()->create([
                'type' => 'in', 'quantity' => $qty, 'quantity_before' => 0, 'quantity_after' => $qty,
                'unit_cost' => $cost, 'reason' => 'Inventaire initial', 'user_id' => $this->staff['production']->id,
                'moved_at' => $this->today->subDays(30),
            ]);
            $suppliers[$sup]->products()->create(['stock_item_id' => $item->id, 'name' => $name, 'reference' => $sku, 'unit_price' => $cost, 'unit' => $unit, 'lead_time_days' => mt_rand(3, 21)]);
        }
    }

    /**
     * @param  list<Client>  $clients
     * @param  array<string, Supplier>  $suppliers
     */
    private function history(array $clients, array $suppliers): void
    {
        $products = Product::with('materials', 'finishes')->whereNotNull('base_price')->where('price_unit', 'unit')->get();
        $cat = ExpenseCategory::pluck('id', 'slug');
        $commercial = $this->staff['commercial'];

        for ($m = 11; $m >= 0; $m--) {
            $monthStart = $this->today->subMonthsNoOverflow($m)->startOfMonth();
            $monthEnd = $m === 0 ? $this->today : $monthStart->endOfMonth();
            $season = in_array($monthStart->month, [6, 7, 12], true) ? 1.5 : 1.0;

            // ---- Demandes / devis / commandes -------------------------------
            $count = (int) round(mt_rand(15, 21) * $season);
            $dates = [];
            for ($i = 0; $i < $count; $i++) {
                $dates[] = $monthStart->addDays(mt_rand(0, max(0, (int) $monthStart->diffInDays($monthEnd))))->setTime(mt_rand(8, 18), mt_rand(0, 59));
            }
            sort($dates);

            foreach ($dates as $createdAt) {
                $client = $clients[mt_rand(0, count($clients) - 1)];
                $product = $products[mt_rand(0, $products->count() - 1)];
                $isSeries = in_array($product->category->slug ?? '', ['medailles', 'objets-personnalises'], true);
                $qty = $isSeries ? mt_rand(4, 25) * 10 : mt_rand(3, 24);
                $size = $product->size_options ? $product->size_options[mt_rand(0, count($product->size_options) - 1)]['label'] : null;
                $material = $product->materials->isNotEmpty() ? $product->materials->random() : null;
                $finish = $product->finishes->isNotEmpty() ? $product->finishes->random() : null;

                $estimate = $this->pricing->estimate([
                    'product_id' => $product->id, 'quantity' => $qty, 'size' => $size,
                    'material_id' => $material?->id, 'finish_id' => $finish?->id,
                    'personalizations' => array_slice($product->personalization_types ?? [], 0, 1),
                    'urgency' => mt_rand(0, 9) === 0 ? 'express' : 'standard',
                ]);

                $project = Project::create([
                    'number' => $this->numbering->next('project', $createdAt->year),
                    'client_id' => $client->id, 'user_id' => $client->user_id,
                    'channel' => ['quote_form', 'studio', 'configurator', 'calculator', 'admin'][mt_rand(0, 4)],
                    'project_type' => $this->typeFor($product), 'product_id' => $product->id,
                    'material_id' => $material?->id, 'finish_id' => $finish?->id,
                    'contact_name' => trim($client->first_name.' '.$client->last_name), 'contact_email' => $client->email,
                    'contact_phone' => $client->phone, 'company' => $client->company,
                    'title' => $product->name.($client->company ? ' — '.$client->company : ''),
                    'description' => 'Demande de '.$qty.' '.mb_strtolower($product->name).' personnalisé(s).',
                    'quantity' => $qty,
                    'personalization' => ['modes' => array_slice($product->personalization_types ?? [], 0, 1), 'text' => ['CHAMPION '.$createdAt->year, 'MEILLEUR ÉLÉMENT', 'MERCI POUR TOUT', 'PROMOTION '.$createdAt->year][mt_rand(0, 3)]],
                    'configuration' => $size ? ['size' => $size] : null,
                    'urgency' => 'standard',
                    'estimate_min' => $estimate['estimate_min'], 'estimate_max' => $estimate['estimate_max'],
                    'estimate_confidence' => $estimate['confidence'], 'status' => 'new',
                    'assigned_to' => $commercial->id, 'created_at' => $createdAt, 'updated_at' => $createdAt,
                ]);
                Product::whereKey($product->id)->increment('requests_count');

                $age = (int) $createdAt->diffInDays($this->today);
                if ($age < 2 || mt_rand(1, 100) > 85) {
                    // Demandes sans suite : abandonnées si anciennes, en cours de chiffrage si récentes
                    $project->update(['status' => $age < 2 ? 'new' : ($age > 10 ? 'cancelled' : 'quote_preparing')]);

                    continue;
                }

                // Devis
                $unitPrice = (int) (round(($estimate['estimate_min'] ?? $product->base_price * $qty) / $qty / 100) * 100);
                $unitCost = (int) round($unitPrice * mt_rand(42, 56) / 100);
                $sentAt = $createdAt->addDays(mt_rand(1, 2));
                $quote = Quote::create([
                    'number' => $this->numbering->next('quote', $sentAt->year), 'project_id' => $project->id,
                    'client_id' => $client->id, 'created_by' => $commercial->id, 'status' => 'sent',
                    'issued_at' => $sentAt, 'valid_until' => $sentAt->addDays(30), 'sent_at' => $sentAt,
                    'tax_rate' => 0, 'created_at' => $sentAt,
                ]);
                $lineTotal = $unitPrice * $qty;
                $quote->items()->create([
                    'product_id' => $product->id, 'description' => $product->name.($size ? ' — '.$size : ''),
                    'quantity' => $qty, 'unit_price' => $unitPrice, 'unit_cost' => $unitCost, 'total' => $lineTotal,
                    'options' => array_filter(['Matériau' => $material?->name, 'Finition' => $finish?->name]) ?: null,
                ]);
                $discount = $qty >= 50 ? (int) round($lineTotal * 0.03 / 100) * 100 : 0;
                $quote->update(['subtotal' => $lineTotal, 'discount_amount' => $discount, 'total' => $lineTotal - $discount]);

                $roll = mt_rand(1, 100);
                if ($age < 6 && $roll > 40) {
                    $project->update(['status' => $roll > 70 ? 'quote_sent' : 'awaiting_validation']);

                    continue;
                }
                if ($roll <= 22) {
                    $quote->update(['status' => $age > 35 && $roll <= 6 ? 'expired' : 'rejected', 'rejected_at' => $sentAt->addDays(4), 'rejection_reason' => $roll <= 6 ? null : ['Budget revu à la baisse', 'Délai trop court', 'Projet reporté'][mt_rand(0, 2)]]);
                    $project->update(['status' => 'rejected']);

                    continue;
                }

                // Commande
                $acceptedAt = $sentAt->addDays(mt_rand(1, 4))->min($this->today);
                $quote->update(['status' => 'converted', 'accepted_at' => $acceptedAt]);
                $project->update(['status' => 'validated']);
                $this->order($quote, $project, $product, $acceptedAt, $lineTotal - $discount, $unitCost * $qty);
            }

            // ---- Recettes comptoir --------------------------------------------
            for ($i = 0; $i < mt_rand(4, 8); $i++) {
                $date = $monthStart->addDays(mt_rand(0, max(0, (int) $monthStart->diffInDays($monthEnd))));
                DB::table('revenues')->insert([
                    'revenue_date' => $date->toDateString(), 'source' => 'vente_comptoir',
                    'description' => ['Gravure express sur place', 'Médailles au comptoir', 'Plaque de boîte aux lettres', 'Impression flyers', 'Porte-clés gravés'][mt_rand(0, 4)],
                    'amount' => mt_rand(5, 60) * 1000, 'payment_method' => ['cash', 'mobile_money'][mt_rand(0, 1)],
                    'recorded_by' => $this->staff['comptabilite']->id, 'created_at' => $date, 'updated_at' => $date,
                ]);
            }

            // ---- Dépenses -------------------------------------------------------
            $expense = function (string $slug, int $day, string $label, int $amount, ?int $supplierId = null, string $method = 'bank_transfer') use ($cat, $monthStart) {
                $date = $monthStart->addDays(min($day, $monthStart->daysInMonth) - 1);
                if ($date->gt($this->today)) {
                    return; // pas de dépense future : la complétude signalera les charges non encore saisies
                }
                DB::table('expenses')->insert([
                    'expense_date' => $date->toDateString(), 'expense_category_id' => $cat[$slug], 'supplier_id' => $supplierId,
                    'description' => $label, 'amount' => $amount, 'payment_method' => $method,
                    'recorded_by' => $this->staff['comptabilite']->id, 'created_at' => $date, 'updated_at' => $date,
                ]);
            };
            $monthLabel = $monthStart->translatedFormat('F Y');
            $expense('loyer', 5, 'Loyer atelier — '.$monthLabel, 450000);
            $expense('electricite', 12, 'Facture électricité — '.$monthLabel, mt_rand(140, 210) * 1000);
            $expense('internet-telephone', 8, 'Fibre + mobiles — '.$monthLabel, 65000, null, 'mobile_money');
            $expense('salaires', 28, 'Salaires équipe — '.$monthLabel, 2350000);
            for ($i = 0; $i < mt_rand(3, 6); $i++) {
                $sup = [$suppliers['metal'], $suppliers['acrylic'], $suppliers['import'], $suppliers['print']][mt_rand(0, 3)];
                $expense('matieres-premieres', mt_rand(1, 27), 'Approvisionnement '.$sup->name, mt_rand(12, 70) * 10000, $sup->id);
            }
            for ($i = 0; $i < mt_rand(3, 5); $i++) {
                $expense('transport-livraison', mt_rand(1, 28), 'Livraisons clients', mt_rand(5, 35) * 1000, $suppliers['transport']->id, 'mobile_money');
            }
            if (mt_rand(0, 2) === 0) {
                $expense('sous-traitance', mt_rand(1, 25), 'Découpe bois sous-traitée', mt_rand(8, 25) * 10000, $suppliers['wood']->id);
            }
            if (mt_rand(0, 3) === 0) {
                $expense('maintenance-machines', mt_rand(1, 25), 'Entretien laser CO₂ / fibre', mt_rand(6, 20) * 10000);
            }
            if (mt_rand(0, 2) === 0) {
                $expense('marketing', mt_rand(1, 25), 'Campagne réseaux sociaux', mt_rand(5, 15) * 10000, null, 'card');
            }
            $expense('fournitures', mt_rand(1, 25), 'Fournitures de bureau et emballages', mt_rand(15, 60) * 1000, null, 'cash');
        }

        // Un achat fournisseur en attente de réception
        $item = StockItem::where('sku', 'MP-PLX-020')->first();
        $purchase = Purchase::create([
            'number' => $this->numbering->next('purchase'), 'supplier_id' => $suppliers['acrylic']->id,
            'purchase_date' => $this->today->subDays(2), 'status' => 'ordered', 'created_by' => $this->staff['production']->id,
        ]);
        $purchase->items()->create(['stock_item_id' => $item->id, 'description' => $item->name, 'quantity' => 6, 'unit_price' => 66000, 'total' => 396000]);
        $purchase->update(['total' => 396000]);
    }

    private function order(Quote $quote, Project $project, Product $product, CarbonImmutable $acceptedAt, int $total, int $cost): void
    {
        $age = (int) $acceptedAt->diffInDays($this->today);
        $lead = mt_rand($product->lead_time_min_days, max($product->lead_time_min_days, $product->lead_time_max_days));
        $due = $acceptedAt->addWeekdays($lead);

        // Statut selon l'ancienneté
        $status = match (true) {
            $age > 30 => mt_rand(1, 40) === 1 ? 'cancelled' : 'completed',
            $age > 14 => ['completed', 'completed', 'delivered', 'ready'][mt_rand(0, 3)],
            $age > 7 => ['ready', 'quality_check', 'delivered', 'in_production'][mt_rand(0, 3)],
            $age > 2 => ['in_production', 'in_design', 'quality_check'][mt_rand(0, 2)],
            default => 'validated',
        };

        $order = Order::create([
            'number' => $this->numbering->next('order', $acceptedAt->year), 'client_id' => $quote->client_id,
            'quote_id' => $quote->id, 'project_id' => $project->id, 'created_by' => $quote->created_by,
            'status' => $status, 'subtotal' => $quote->subtotal, 'discount_amount' => $quote->discount_amount,
            'total' => $total, 'cost_estimate' => $cost, 'ordered_at' => $acceptedAt, 'due_date' => $due,
            'delivery_method' => mt_rand(0, 2) === 0 ? 'delivery' : 'pickup',
            'delivered_at' => in_array($status, ['delivered', 'completed'], true) ? $due->min($this->today) : null,
            'completed_at' => $status === 'completed' ? $due->addDays(1)->min($this->today) : null,
            'created_at' => $acceptedAt,
        ]);
        foreach ($quote->items as $item) {
            $order->items()->create($item->only(['product_id', 'description', 'quantity', 'unit_price', 'unit_cost', 'total', 'options']));
        }

        // Historique des statuts
        $flow = array_slice(Order::STATUSES, 0, array_search($status === 'cancelled' ? 'validated' : $status, Order::STATUSES, true) + 1);
        if ($status === 'cancelled') {
            $flow[] = 'cancelled';
        }
        $prev = null;
        $span = max(1, (int) $acceptedAt->diffInDays(($order->completed_at ? CarbonImmutable::parse($order->completed_at) : $this->today)));
        foreach ($flow as $i => $s) {
            $order->statusHistory()->create([
                'from_status' => $prev, 'to_status' => $s, 'user_id' => $this->staff['production']->id,
                'comment' => $i === 0 ? 'Devis '.$quote->number.' validé.' : null,
                'created_at' => $acceptedAt->addDays((int) floor($span * $i / max(1, count($flow)))),
            ]);
            $prev = $s;
        }

        // Ordre de production cohérent
        $po = $order->productionOrders()->create([
            'number' => $this->numbering->next('production', $acceptedAt->year),
            'status' => match ($status) {
                'validated' => 'pending', 'in_design', 'in_production', 'quality_check' => 'in_progress',
                'cancelled' => 'cancelled', default => 'done',
            },
            'priority' => $due->diffInDays($this->today, false) > -2 && ! in_array($status, ['ready', 'delivered', 'completed'], true) ? 'high' : 'normal',
            'assigned_to' => $this->staff['production']->id, 'due_at' => $due,
            'started_at' => $status !== 'validated' ? $acceptedAt->addDay() : null,
            'finished_at' => in_array($status, ['ready', 'delivered', 'completed'], true) ? $due->subDay()->min($this->today) : null,
        ]);
        $doneSteps = match ($status) {
            'validated', 'cancelled' => 0, 'in_design' => 0, 'in_production' => 2, 'quality_check' => 4, default => 6,
        };
        foreach (ProductionOrder::DEFAULT_STEPS as $i => $step) {
            $po->steps()->create($step + [
                'sort_order' => $i,
                'status' => $i < $doneSteps ? 'done' : ($i === $doneSteps && in_array($status, ['in_design', 'in_production', 'quality_check'], true) ? 'in_progress' : 'pending'),
                'completed_at' => $i < $doneSteps ? $acceptedAt->addDays($i + 1)->min($this->today) : null,
                'assigned_to' => $this->staff[$i === 0 ? 'designer' : 'production']->id,
            ]);
        }

        if ($status === 'cancelled') {
            return;
        }

        // Acompte 50 % à la commande
        $deposit = (int) (round($total / 2 / 100) * 100);
        $order->payments()->create([
            'client_id' => $order->client_id, 'amount' => $deposit, 'method' => ['mobile_money', 'bank_transfer', 'cash'][mt_rand(0, 2)],
            'paid_at' => $acceptedAt, 'reference' => 'ACOMPTE', 'recorded_by' => $this->staff['comptabilite']->id,
        ]);

        // Facturation à la mise à disposition
        if (in_array($status, ['ready', 'delivered', 'completed'], true)) {
            $issued = CarbonImmutable::parse($order->delivered_at ?? $due)->min($this->today);
            $invoice = Invoice::create([
                'number' => $this->numbering->next('invoice', $issued->year), 'order_id' => $order->id,
                'client_id' => $order->client_id, 'status' => 'issued', 'issued_at' => $issued,
                'due_at' => $issued->addDays(15), 'subtotal' => $order->subtotal, 'discount_amount' => $order->discount_amount,
                'total' => $total, 'created_by' => $this->staff['comptabilite']->id,
            ]);
            $order->payments()->update(['invoice_id' => $invoice->id]);
            $paid = $deposit;
            if ($status === 'completed' || ($status === 'delivered' && mt_rand(0, 1))) {
                $invoice->payments()->create([
                    'order_id' => $order->id, 'client_id' => $order->client_id, 'amount' => $total - $deposit,
                    'method' => ['mobile_money', 'bank_transfer', 'cash', 'cheque'][mt_rand(0, 3)],
                    'paid_at' => $issued->addDays(mt_rand(0, 10))->min($this->today), 'reference' => 'SOLDE',
                    'recorded_by' => $this->staff['comptabilite']->id,
                ]);
                $paid = $total;
            }
            $invoice->update(['amount_paid' => $paid, 'status' => $paid >= $total ? 'paid' : 'partially_paid']);
            $order->update(['payment_status' => $paid >= $total ? 'paid' : 'partial']);
        } else {
            $order->update(['payment_status' => 'partial']);
        }
    }

    private function typeFor(Product $product): string
    {
        return match ($product->category->slug ?? '') {
            'trophees' => 'trophee', 'medailles' => 'medaille', 'plaques' => 'plaque', 'gravure' => 'gravure',
            'impression', 'supports-publicitaires' => 'impression', 'signaletique' => 'signaletique',
            'cadeaux-entreprise' => 'cadeau', default => 'objet',
        };
    }

    private function leads(): void
    {
        $leads = [
            ['Paul Ahoua', 'Complexe Sportif Nord (démo)', 'salon', 'qualified', 'Trophées tournoi annuel', 1500000],
            ['Nadia Keita', 'Agence Lumen Com (démo)', 'reseaux_sociaux', 'contacted', 'Signalétique nouveaux bureaux', 3200000],
            ['Hervé Zadi', null, 'formulaire_contact', 'new', 'Plaque commémorative', 90000],
            ['Carine Assi', 'École Les Colibris (démo)', 'recommandation', 'new', 'Médailles fin d\'année', 400000],
            ['Moussa Cissé', 'Transports Rapides (démo)', 'salon', 'lost', 'Goodies gravés', 600000],
        ];
        foreach ($leads as $i => [$name, $company, $source, $status, $interest, $value]) {
            Lead::create([
                'name' => $name, 'company' => $company, 'email' => 'prospect'.($i + 1).'@leads.example',
                'phone' => '+225 01 '.mt_rand(10, 99).' '.mt_rand(10, 99).' '.mt_rand(10, 99).' '.mt_rand(10, 99),
                'source' => $source, 'status' => $status, 'interest' => $interest, 'estimated_value' => $value,
                'assigned_to' => $this->staff['commercial']->id, 'created_at' => $this->today->subDays(mt_rand(1, 40)),
            ]);
        }
    }

    private function connectedObjects(): void
    {
        $orders = Order::with('client')->where('status', 'completed')->whereHas('items.product', fn ($q) => $q->whereIn('model_3d', ['cup', 'star', 'crystal', 'plaque']))->limit(4)->get();
        $samples = [
            ['Meilleur buteur', 'Tournoi inter-entreprises', 'Kader Bamba', 'Ballon d\'or du tournoi, 11 buts en 5 matchs.'],
            ['Prix de l\'excellence', 'Gala des excellences', 'Marie-Laure Koffi', 'Pour une année de résultats exceptionnels.'],
            ['Vainqueur — Simple messieurs', 'Open de la Riviera', 'Désiré Ahi', 'Champion du tournoi après une finale en trois sets.'],
            ['Trente ans de service', 'Cérémonie de départ', 'Bernard Kouamé', 'Merci pour trente années de fidélité et d\'engagement.'],
        ];
        foreach ($orders as $i => $order) {
            [$category, $event, $recipient, $message] = $samples[$i];
            $qr = QrCode::create([
                'code' => 'UG'.strtoupper(substr(md5('demo'.$i), 0, 6)), 'order_id' => $order->id, 'client_id' => $order->client_id,
                'type' => 'trophy', 'title' => $category, 'recipient_name' => $recipient, 'event_name' => $event,
                'year' => (int) $order->ordered_at->format('Y'), 'category_label' => $category,
                'organization' => $order->client->company ?? $order->client->display_name, 'message' => $message,
                'is_public' => true, 'is_active' => true, 'scans_count' => mt_rand(3, 60), 'created_by' => $this->staff['designer']->id,
            ]);
            if ($i < 2) {
                $cert = new DigitalCertificate([
                    'number' => $this->numbering->next('certificate'), 'qr_code_id' => $qr->id, 'order_id' => $order->id,
                    'recipient_name' => $recipient, 'award_title' => $category, 'event_name' => $event,
                    'organization' => $qr->organization, 'issued_on' => $order->completed_at ?? $this->today,
                    'created_by' => $this->staff['designer']->id,
                ]);
                $cert->verification_hash = $cert->computeHash();
                $cert->save();
            }
        }
    }
}
