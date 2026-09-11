/**
 * @file app.js
 * @description Gestore Comande Pizzeria Avanzato (OOP, Offline Support, Web Speech API e Internazionalizzazione i18n)
 */

// Costanti di Configurazione Globali
const CONFIG = Object.freeze({
  COPERTO_COST: 1.50,
  CURRENCY_SYMBOL: '€',
  API_ENDPOINT: 'api.php',
  STORAGE_KEY: 'pizzeria_current_order',
  LANG_STORAGE_KEY: 'pizzeria_preferred_lang'
});

// Dizionario Traduzioni (i18n)
const TRANSLATIONS = {
  it: {
    emptyProducts: "Nessun prodotto trovato",
    emptyCart: "Nessun elemento selezionato",
    itemsCountOne: "1 articolo",
    itemsCountMany: "{count} articoli",
    itemNotePlaceholder: "Note (es. ben cotta)...",
    cadPrice: "cad.",
    ticketTitle: "Pizzeria - Comanda Tavolo",
    ticketTable: "Tavolo",
    ticketCovers: "Coperti",
    ticketDate: "Data",
    ticketTotal: "TOTALE",
    ticketNotes: "Note",
    alertEmptyCart: "Aggiungi almeno un articolo al carrello.",
    alertPrivacy: "Accetta le condizioni sulla privacy per procedere.",
    alertOrderSuccess: "Ordine inviato con successo per il Tavolo {table}!",
    alertNetworkError: "Errore di connessione al server. Verificare la rete.",
    alertVoiceUnsupported: "Riconoscimento vocale non supportato dal browser.",
    alertVoiceActive: "Riconoscimento vocale già attivo."
  },
  en: {
    emptyProducts: "No products found",
    emptyCart: "No items selected",
    itemsCountOne: "1 item",
    itemsCountMany: "{count} items",
    itemNotePlaceholder: "Notes (e.g. well done)...",
    cadPrice: "each",
    ticketTitle: "Pizzeria - Table Order",
    ticketTable: "Table",
    ticketCovers: "Covers",
    ticketDate: "Date",
    ticketTotal: "TOTAL",
    ticketNotes: "Notes",
    alertEmptyCart: "Please add at least one item to the cart.",
    alertPrivacy: "Please accept the privacy policy to proceed.",
    alertOrderSuccess: "Order successfully sent for Table {table}!",
    alertNetworkError: "Server connection error. Please check your network.",
    alertVoiceUnsupported: "Voice recognition is not supported by your browser.",
    alertVoiceActive: "Voice recognition is already active."
  }
};

// Database Prodotti Iniziale
const PRODUCTS_DATA = [
  { id: 1, name: 'Margherita', category: 'pizze', price: 6.00, icon: 'fa-pizza-slice' },
  { id: 2, name: 'Diavola', category: 'pizze', price: 7.50, icon: 'fa-pepper-hot' },
  { id: 3, name: '4 Formaggi', category: 'pizze', price: 8.00, icon: 'fa-cheese' },
  { id: 4, name: 'Acqua Naturale', category: 'bevande', price: 2.00, icon: 'fa-bottle-water' },
  { id: 5, name: 'Birra Media', category: 'bevande', price: 4.50, icon: 'fa-beer-mug-empty' },
  { id: 6, name: 'Tiramisù', category: 'dolci', price: 5.00, icon: 'fa-cake-candles' }
];

class OrderManager {
  constructor(products, config) {
    this.products = products;
    this.config = config;
    this.order = this.loadOrderFromStorage();
    this.currentLang = localStorage.getItem(this.config.LANG_STORAGE_KEY) || 'it';
    this.recognition = null;
    
    this.initDOMReferences();
    this.initEventListeners();
    this.initVoiceRecognition();
    this.setLanguage(this.currentLang);
    this.renderProducts(this.products);
    this.updateUI();
  }

  // Inizializzazione Riferimenti DOM
  initDOMReferences() {
    this.dom = {
      productsGrid: document.getElementById('productsGrid'),
      orderItems: document.getElementById('orderItems'),
      totalPrice: document.getElementById('totalPrice'),
      orderCount: document.getElementById('orderCount'),
      tableNumber: document.getElementById('tableNumber'),
      coversNumber: document.getElementById('coversNumber'),
      privacyCheck: document.getElementById('privacyCheck'),
      searchInput: document.getElementById('searchInput'),
      printableTicket: document.getElementById('printableTicket'),
      btnVoice: document.getElementById('btnVoice')
    };
  }

  // Inizializzazione Event Listeners
  initEventListeners() {
    if (this.dom.coversNumber) {
      this.dom.coversNumber.addEventListener('input', () => this.updateUI());
    }

    if (this.dom.tableNumber) {
      this.dom.tableNumber.addEventListener('input', () => this.updateUI());
    }

    if (this.dom.searchInput) {
      this.dom.searchInput.addEventListener('input', this.debounce((e) => {
        this.filterProducts(e.target.value);
      }, 250));
    }

    this.setupCategoryFilters();
    this.setupLanguageSwitcher();
  }

  // Supporto i18n / Traduzione
  t(key, params = {}) {
    let text = (TRANSLATIONS[this.currentLang] && TRANSLATIONS[this.currentLang][key]) || key;
    Object.keys(params).forEach(p => {
      text = text.replace(`{${p}}`, params[p]);
    });
    return text;
  }

  setLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    this.currentLang = lang;
    localStorage.setItem(this.config.LANG_STORAGE_KEY, lang);
    document.documentElement.lang = lang;

    // Aggiorna elementi statici HTML contrassegnati con data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (TRANSLATIONS[lang][key]) {
        el.textContent = TRANSLATIONS[lang][key];
      }
    });

    // Aggiorna lo stato visivo dei pulsanti di selezione lingua
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Rirenderizza componenti dinamici
    this.renderProducts(this.products);
    this.updateUI();
  }

  setupLanguageSwitcher() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setLanguage(btn.dataset.lang);
      });
    });
  }

  // Persistence: LocalStorage
  saveOrderToStorage() {
    try {
      localStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(this.order));
    } catch (e) {
      console.warn('Impossibile salvare l\'ordine in locale:', e);
    }
  }

  loadOrderFromStorage() {
    try {
      const saved = localStorage.getItem(this.config.STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Impossibile caricare l\'ordine salvato:', e);
      return [];
    }
  }

  // Rendering Prodotti nel Grid
  renderProducts(items) {
    if (!this.dom.productsGrid) return;

    if (items.length === 0) {
      this.dom.productsGrid.innerHTML = `
        <div class="empty-state">
          <p>${this.t('emptyProducts')}</p>
        </div>`;
      return;
    }

    this.dom.productsGrid.innerHTML = items.map(p => `
      <div class="product-card" data-id="${p.id}" tabindex="0">
        <i class="fa-solid ${p.icon || 'fa-utensils'}"></i>
        <h4>${this.escapeHTML(p.name)}</h4>
        <div class="price">${this.config.CURRENCY_SYMBOL} ${p.price.toFixed(2)}</div>
      </div>
    `).join('');

    this.dom.productsGrid.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.dataset.id, 10);
        this.addToOrder(id);
      });
    });
  }

  // Gestione Carrello
  addToOrder(productId, quantity = 1) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = this.order.find(item => item.id === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.order.push({
        ...product,
        quantity: quantity,
        note: ''
      });
    }

    this.saveOrderToStorage();
    this.updateUI();
  }

  updateQuantity(productId, delta) {
    const item = this.order.find(i => i.id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      this.order = this.order.filter(i => i.id !== productId);
    }

    this.saveOrderToStorage();
    this.updateUI();
  }

  updateItemNote(productId, noteText) {
    const item = this.order.find(i => i.id === productId);
    if (item) {
      item.note = noteText.trim();
      this.saveOrderToStorage();
    }
  }

  clearOrder() {
    this.order = [];
    if (this.dom.tableNumber) this.dom.tableNumber.value = '';
    if (this.dom.coversNumber) this.dom.coversNumber.value = '';
    if (this.dom.privacyCheck) this.dom.privacyCheck.checked = false;

    this.saveOrderToStorage();
    this.updateUI();
  }

  // Calcolo e Aggiornamento Interfaccia
  calculateTotals() {
    const itemsTotal = this.order.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = this.order.reduce((sum, item) => sum + item.quantity, 0);
    const covers = this.dom.coversNumber ? (parseInt(this.dom.coversNumber.value, 10) || 0) : 0;
    const coversTotal = covers * this.config.COPERTO_COST;
    const grandTotal = itemsTotal + coversTotal;

    return { itemsTotal, itemCount, covers, coversTotal, grandTotal };
  }

  updateUI() {
    const { itemCount, covers, grandTotal } = this.calculateTotals();

    // Render Contatore Articoli
    if (this.dom.orderCount) {
      this.dom.orderCount.textContent = itemCount === 1 
        ? this.t('itemsCountOne') 
        : this.t('itemsCountMany', { count: itemCount });
    }

    // Render Lista Ordine
    if (this.dom.orderItems) {
      if (this.order.length === 0) {
        this.dom.orderItems.innerHTML = `
          <div class="empty-state">
            <i class="fa-solid fa-basket-shopping"></i>
            <p>${this.t('emptyCart')}</p>
          </div>`;
      } else {
        this.dom.orderItems.innerHTML = this.order.map(item => `
          <div class="item-row">
            <div class="item-details">
              <strong>${this.escapeHTML(item.name)}</strong>
              <small class="text-muted">${this.config.CURRENCY_SYMBOL} ${item.price.toFixed(2)} ${this.t('cadPrice')}</small>
              <input 
                type="text" 
                class="item-note-input" 
                placeholder="${this.t('itemNotePlaceholder')}" 
                value="${this.escapeHTML(item.note)}" 
                data-id="${item.id}"
              />
            </div>
            <div class="item-controls">
              <button class="btn-qty" data-id="${item.id}" data-action="decrease">-</button>
              <span>${item.quantity}</span>
              <button class="btn-qty" data-id="${item.id}" data-action="increase">+</button>
            </div>
          </div>
        `).join('');

        this.bindItemRowEvents();
      }
    }

    // Render Prezzo Totale
    if (this.dom.totalPrice) {
      this.dom.totalPrice.textContent = `${this.config.CURRENCY_SYMBOL} ${grandTotal.toFixed(2)}`;
    }

    // Update Stampa Scontrino
    this.updatePrintableTicket(covers, grandTotal);
  }

  bindItemRowEvents() {
    this.dom.orderItems.querySelectorAll('.item-note-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const id = parseInt(e.target.dataset.id, 10);
        this.updateItemNote(id, e.target.value);
      });
    });

    this.dom.orderItems.querySelectorAll('.btn-qty').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        const delta = btn.dataset.action === 'increase' ? 1 : -1;
        this.updateQuantity(id, delta);
      });
    });
  }

  updatePrintableTicket(covers, grandTotal) {
    if (!this.dom.printableTicket) return;

    const tableNum = this.dom.tableNumber ? (this.dom.tableNumber.value || 'N/D') : 'N/D';
    const dateLocale = this.currentLang === 'it' ? 'it-IT' : 'en-US';
    
    this.dom.printableTicket.innerHTML = `
      <h3>${this.t('ticketTitle')}</h3>
      <p><strong>${this.t('ticketTable')}:</strong> ${this.escapeHTML(tableNum)} | <strong>${this.t('ticketCovers')}:</strong> ${covers}</p>
      <p><strong>${this.t('ticketDate')}:</strong> ${new Date().toLocaleString(dateLocale)}</p>
      <hr>
      <ul style="list-style:none; padding:0;">
        ${this.order.map(i => `
          <li>
            ${i.quantity}x ${this.escapeHTML(i.name)} - ${this.config.CURRENCY_SYMBOL} ${(i.price * i.quantity).toFixed(2)}
            ${i.note ? `<br><small><i>${this.t('ticketNotes')}: ${this.escapeHTML(i.note)}</i></small>` : ''}
          </li>
        `).join('')}
      </ul>
      <hr>
      <strong>${this.t('ticketTotal')}: ${this.config.CURRENCY_SYMBOL} ${grandTotal.toFixed(2)}</strong>
    `;
  }

  // Filtri & Ricerca
  setupCategoryFilters() {
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const category = btn.dataset.category;
        const filtered = category === 'all' 
          ? this.products 
          : this.products.filter(p => p.category === category);

        this.renderProducts(filtered);
      });
    });
  }

  filterProducts(query) {
    const cleanQuery = query.toLowerCase().trim();
    const filtered = this.products.filter(p => p.name.toLowerCase().includes(cleanQuery));
    this.renderProducts(filtered);
  }

  // Web Speech API
  initVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;

    this.recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript.toLowerCase();

      this.products.forEach(product => {
        if (speechResult.includes(product.name.toLowerCase())) {
          this.addToOrder(product.id);
        }
      });
    };

    this.recognition.onerror = (err) => {
      console.error('Errore riconoscimento vocale:', err.error);
    };
  }

  startVoice() {
    if (this.recognition) {
      try {
        this.recognition.lang = this.currentLang === 'it' ? 'it-IT' : 'en-US';
        this.recognition.start();
      } catch (e) {
        alert(this.t('alertVoiceActive'));
      }
    } else {
      alert(this.t('alertVoiceUnsupported'));
    }
  }

  // Network & Submit
  async sendOrder() {
    if (this.order.length === 0) {
      return alert(this.t('alertEmptyCart'));
    }

    if (this.dom.privacyCheck && !this.dom.privacyCheck.checked) {
      return alert(this.t('alertPrivacy'));
    }

    const { covers, grandTotal } = this.calculateTotals();
    const table = this.dom.tableNumber ? (this.dom.tableNumber.value.trim() || 'N/D') : 'N/D';

    const payload = {
      tavolo: table,
      coperti: covers,
      totale: grandTotal,
      consensoPrivacy: true,
      timestamp: new Date().toISOString(),
      items: this.order.map(i => ({
        id: i.id,
        nome: i.name,
        quantita: i.quantity,
        prezzoUnitario: i.price,
        note: i.note
      }))
    };

    try {
      const response = await fetch(this.config.API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Errore HTTP: ${response.status}`);

      const data = await response.json();

      if (data.status === 'success' || response.ok) {
        alert(this.t('alertOrderSuccess', { table }));

        // Bridge Nativo Android WebView
        if (window.AndroidBridge && typeof window.AndroidBridge.onOrderSent === 'function') {
          window.AndroidBridge.onOrderSent(table, grandTotal);
        }

        this.clearOrder();
      }
    } catch (error) {
      console.error('Errore durante l\'invio dell\'ordine:', error);
      alert(this.t('alertNetworkError'));
    }
  }

  // Utility Functions
  debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// Inizializzazione Globale al caricamento DOM
let appManager;
document.addEventListener('DOMContentLoaded', () => {
  appManager = new OrderManager(PRODUCTS_DATA, CONFIG);
});

// Funzioni Globali esposte per gli handler HTML
function sendOrder() { appManager.sendOrder(); }
function clearOrder() { appManager.clearOrder(); }
function startVoiceRecognition() { appManager.startVoice(); }
function toggleLanguage(lang) { appManager.setLanguage(lang); }
