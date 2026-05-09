const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const MEPA_URL = 'https://www.acquistinretepa.it/publicservices/vetrineservices/getAltriBandiRdoAperte';

const DEFAULT_PAYLOAD = {
  isArchive: false,
  strumento: [{ label: "RDO APERTE", totale: 1, id: 1 }],
  categoria: [],
  idt: "",
  orderBy: { campo: "dataPubblicazione", verso: "desc" },
  paginazione: { pagina: 1, itemPagina: 50 },
  tempo: { dataDa: null, dataA: null }
};

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Accept'] }));
app.options('*', cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'MEPA RdO Proxy', timestamp: new Date().toISOString() });
});

async function fetchMepa(payload) {
  const response = await fetch(MEPA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Origin': 'https://www.acquistinretepa.it',
      'Referer': 'https://www.acquistinretepa.it/opencms/opencms/vetrina_bandi.html?filter=RDO',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`MEPA upstream error: ${response.status}`);
  return response.json();
}

// Debug: restituisce la risposta grezza completa
app.get('/debug', async (req, res) => {
  try {
    const raw = await fetchMepa(DEFAULT_PAYLOAD);
    res.json(raw);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/rdo', async (req, res) => {
  try {
    const pagina = parseInt(req.query.pagina) || 1;
    const itemPagina = parseInt(req.query.itemPagina) || 50;
    const verso = req.query.verso || 'desc';
    const campo = req.query.campo || 'dataPubblicazione';

    const payload = { ...DEFAULT_PAYLOAD, orderBy: { campo, verso }, paginazione: { pagina, itemPagina } };
    const raw = await fetchMepa(payload);

    // Esplora ricorsivamente la struttura per trovare array di oggetti con numeroRdo
    function findLista(obj, depth = 0) {
      if (depth > 5 || !obj || typeof obj !== 'object') return null;
      if (Array.isArray(obj) && obj.length > 0 && obj[0]?.numeroRdo) return obj;
      for (const key of Object.keys(obj)) {
        const found = findLista(obj[key], depth + 1);
        if (found) return found;
      }
      return null;
    }

    const lista = findLista(raw) || [];
    const totale = raw.totale || raw.total || raw.result?.totale || lista.length;

    res.json({ listaRdoAperte: lista, totale, _raw_keys: Object.keys(raw) });
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`MEPA Proxy running on port ${PORT}`);
});
