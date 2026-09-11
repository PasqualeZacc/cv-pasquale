-- Creazione Tabella Prodotti
CREATE TABLE IF NOT EXISTS prodotti (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    prezzo DECIMAL(6, 2) NOT NULL,
    giacenza INT DEFAULT 100
);
-- Creazione Tabella Comande
CREATE TABLE IF NOT EXISTS comande (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tavolo VARCHAR(10) NOT NULL,
    coperti INT DEFAULT 1,
    totale DECIMAL(8, 2) NOT NULL,
    stato ENUM(
        'in_attesa',
        'in_preparazione',
        'pronto',
        'pagato'
    ) DEFAULT 'in_attesa',
    consenso_privacy BOOLEAN NOT NULL DEFAULT TRUE,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Dettaglio Voci della Comanda
CREATE TABLE IF NOT EXISTS dettagli_comanda (
    id INT AUTO_INCREMENT PRIMARY KEY,
    comanda_id INT NOT NULL,
    prodotto_id INT NOT NULL,
    quantita INT NOT NULL,
    prezzo_unitario DECIMAL(6, 2) NOT NULL,
    note TEXT,
    FOREIGN KEY (comanda_id) REFERENCES comande(id) ON DELETE CASCADE,
    FOREIGN KEY (prodotto_id) REFERENCES prodotti(id)
);
-- TRIGGER: Scarico automatico magazzino all'inserimento del dettaglio
DELIMITER // CREATE TRIGGER scarica_magazzino_after_insert
AFTER
INSERT ON dettagli_comanda FOR EACH ROW BEGIN
UPDATE prodotti
SET giacenza = giacenza - NEW.quantita
WHERE id = NEW.prodotto_id;
END;
// DELIMITER;
-- QUERY DI REPORTISTICA: Incasso giornaliero e conteggio prodotti
SELECT DATE(data_creazione) AS data,
    COUNT(DISTINCT id) AS totale_ordini,
    SUM(totale) AS incasso_totale,
    SUM(coperti) AS totale_coperti
FROM comande
WHERE DATE(data_creazione) = CURDATE()
GROUP BY DATE(data_creazione);
