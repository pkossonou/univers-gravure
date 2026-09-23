import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EstimateDisplay } from "@/components/site/estimate-panel";
import type { Estimate } from "@/lib/types";
import { StatusBadge } from "./badge";
import { DataTable } from "./data-table";
import { ChoiceChips, Field, Input } from "./field";
import { Stepper, Timeline } from "./primitives";

const estimate = (over: Partial<Estimate> = {}): Estimate => ({
  confidence: "firm", estimate_min: 60000, estimate_max: 60000, currency: "XOF", label: "Estimation indicative",
  disclaimer: "Estimation non contractuelle.", breakdown: [{ label: "Coupe", amount: 60000 }], reasons: [], lead_time_days: { min: 3, max: 7 }, ...over,
});

describe("Field", () => {
  it("associe le label au champ et annonce l'erreur", () => {
    render(<Field label="E-mail" error="Adresse invalide">{(p) => <Input {...p} />}</Field>);
    const input = screen.getByLabelText("E-mail");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Adresse invalide");
    expect(input).toHaveAttribute("aria-describedby", screen.getByRole("alert").id);
  });
});

describe("ChoiceChips", () => {
  it("gère la sélection multiple au clavier / clic", () => {
    const onChange = vi.fn();
    render(<ChoiceChips multiple ariaLabel="Techniques" options={[{ value: "gravure", label: "Gravure" }, { value: "uv", label: "UV" }]} value={["gravure"]} onChange={onChange} />);
    expect(screen.getByRole("checkbox", { name: "Gravure" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("checkbox", { name: "UV" }));
    expect(onChange).toHaveBeenCalledWith(["gravure", "uv"]);
  });
});

describe("Timeline & Stepper", () => {
  it("marque l'étape en cours pour les technologies d'assistance", () => {
    render(<Timeline stages={[{ key: "a", label: "Demande", state: "done" }, { key: "b", label: "Devis", state: "current" }, { key: "c", label: "Production", state: "upcoming" }]} />);
    const current = screen.getByText("Devis").closest("li");
    expect(current).toHaveAttribute("aria-current", "step");
  });

  it("affiche la progression textuelle", () => {
    render(<Stepper steps={["Type", "Forme", "Matériau"]} current={1} />);
    expect(screen.getByText(/Étape 02 \/ 03/)).toBeInTheDocument();
  });
});

describe("StatusBadge", () => {
  it("affiche le libellé fourni", () => {
    render(<StatusBadge status="in_production" label="En production" />);
    expect(screen.getByText("En production")).toBeInTheDocument();
  });
});

describe("EstimateDisplay", () => {
  it("n'affiche jamais de montant définitif quand une validation est requise", () => {
    render(<EstimateDisplay estimate={estimate({ confidence: "needs_review", estimate_min: null, estimate_max: null, breakdown: [], label: "Votre demande nécessite une validation par notre équipe." })} />);
    expect(screen.getByText("Votre demande nécessite une validation par notre équipe.")).toBeInTheDocument();
    expect(screen.queryByText(/FCFA/)).toBeNull();
  });

  it("affiche une fourchette « à partir de »", () => {
    render(<EstimateDisplay estimate={estimate({ confidence: "from", estimate_min: 100000, estimate_max: 130000, label: "Estimation à partir de" })} />);
    expect(screen.getByText("Estimation à partir de")).toBeInTheDocument();
    expect(screen.getByText(/100 000 FCFA/)).toBeInTheDocument();
    expect(screen.getByText(/130 000 FCFA/)).toBeInTheDocument();
    expect(screen.getByText(/non contractuelle/)).toBeInTheDocument();
  });
});

describe("DataTable", () => {
  it("affiche les lignes, trie et signale l'état vide", () => {
    const onStateChange = vi.fn();
    const { rerender } = render(
      <DataTable
        columns={[{ key: "name", header: "Client", sort: "name", cell: (r: { id: number; name: string }) => r.name }]}
        rows={[{ id: 1, name: "Horizon" }]}
        state={{ page: 1, sort: "-created_at", search: "" }}
        onStateChange={onStateChange}
        rowKey={(r) => r.id}
      />,
    );
    expect(screen.getByText("Horizon")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Client/ }));
    expect(onStateChange).toHaveBeenCalledWith({ page: 1, sort: "name", search: "" });

    rerender(
      <DataTable columns={[{ key: "name", header: "Client", cell: (r: { id: number; name: string }) => r.name }]} rows={[]} state={{ page: 1, sort: "", search: "" }} onStateChange={onStateChange} rowKey={(r) => r.id} empty={{ title: "Aucun client" }} />,
    );
    expect(screen.getByText("Aucun client")).toBeInTheDocument();
  });
});
