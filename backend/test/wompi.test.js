import test from "node:test";
import assert from "node:assert/strict";
import { verificarFirmaEventoWompi } from "../src/utils/wompi.js";

const eventoAprobado = () => ({
    event: "transaction.updated",
    data: {
        transaction: {
            id: "1234-1610641025-49201",
            status: "APPROVED",
            amount_in_cents: 4490000
        }
    },
    signature: {
        properties: [
            "transaction.id",
            "transaction.status",
            "transaction.amount_in_cents"
        ],
        checksum: "0B7575DB86875F7CE16472AC4F1A71183F5D37D38ED8E0E68B6A7573F23C4A8F"
    },
    timestamp: 1530291411
});

test("verifica una firma oficial de evento de Wompi", () => {
    assert.equal(
        verificarFirmaEventoWompi(
            eventoAprobado(),
            "events_secret_for_unit_test_only"
        ),
        true
    );
});

test("rechaza eventos alterados o firmados con otro secreto", () => {
    const eventoAlterado = eventoAprobado();
    eventoAlterado.data.transaction.amount_in_cents += 100;

    assert.equal(
        verificarFirmaEventoWompi(
            eventoAlterado,
            "events_secret_for_unit_test_only"
        ),
        false
    );
    assert.equal(verificarFirmaEventoWompi(eventoAprobado(), "wrong_test_secret"), false);
});
