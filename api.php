<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");

// Connessione Database
$host = "localhost";
$user = "root";
$pass = "";
$dbname = "pizzeria_db";

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Connessione al database fallita"]);
    exit();
}

// Lettura del Payload JSON
$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['tavolo']) || empty($data['items'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Dati incompleti"]);
    exit();
}

$tavolo = $conn->real_escape_string($data['tavolo']);
$coperti = isset($data['coperti']) ? intval($data['coperti']) : 1;
$totale = floatval($data['totale']);
$privacy = !empty($data['consensoPrivacy']) ? 1 : 0;

// Avvio Transazione SQL
$conn->begin_transaction();

try {
    $stmt = $conn->prepare("INSERT INTO comande (tavolo, coperti, totale, consenso_privacy) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("sidi", $tavolo, $coperti, $totale, $privacy);
    $stmt->execute();
    $comanda_id = $stmt->insert_id;
    $stmt->close();

    $stmt_item = $conn->prepare("INSERT INTO dettagli_comanda (comanda_id, prodotto_id, quantita, prezzo_unitario, note) VALUES (?, ?, ?, ?, ?)");

    foreach ($data['items'] as $item) {
        $p_id = intval($item['id']);
        $qta = intval($item['quantita']);
        $prezzo = floatval($item['prezzoUnitario']);
        $note = $conn->real_escape_string($item['note'] ?? '');

        $stmt_item->bind_param("iiids", $comanda_id, $p_id, $qta, $prezzo, $note);
        $stmt_item->execute();
    }
    $stmt_item->close();

    // Commit Transazione
    $conn->commit();
    echo json_encode(["status" => "success", "comanda_id" => $comanda_id, "message" => "Ordine salvato correttamente"]);
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Errore durante il salvataggio: " . $e->getMessage()]);
}

$conn->close();
