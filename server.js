const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const MEPA_URL = 'https://www.acquistinretepa.it/publicservices/vetrineservices/getAltriBandiRdoAperte';
const { stimaRegione } = require('./geo');

app.use(cors({ 
  origin: '*', 
  methods: ['GET', 'POST', 'OPTIONS'], 
  allowedHeaders: ['Content-Type', 'Accept'] 
}));

app.options('*', cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'MEPA RdO Proxy', 
    timestamp: new Date().toISOString() 
  });
});

async function fetchPagina(pagina, itemPagina = 100, campo = 'dataPubblicazione', verso = 'desc') {
  const payload = {
    isArchive: false,
    strumento: [{ label: "RDO APERTE", totale: 1, id: 1 }],
    categoria: [],
    idt: "",
    orderBy: { campo, verso },
    paginazione: { pagina, itemPagina },
    tempo: { dataDa: null, dataA: null }
  };

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

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

function findLista(obj, depth = 0) {
  if (depth > 5 || !obj || typeof obj !== 'object') return null;

  if (Array.isArray(obj) && obj.length > 0 && obj[0]?.numeroRdo) {
    return obj;
  }

  for (const key of Object.keys(obj)) {
    const found = findLista(obj[key], depth + 1);
    if (found) return found;
  }

  return null;
}

function findTotale(obj, depth = 0) {
  if (depth > 5 || !obj || typeof obj !== 'object') return null;

  for (const key of ['totale', 'total', 'totalElements', 'count']) {
    if (typeof obj[key] === 'number' && obj[key] > 0) {
      return obj[key];
    }
  }

  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object') {
      const found = findTotale(obj[key], depth + 1);
      if (found) return found;
    }
  }

  return null;
}

function normalizzaMepa(r) {
  return {
    ...r,

    // Campi aggiunti per preparare la piattaforma multi-fonte
    source: "MEPA",
    sourceLabel: "MePA",
    sourceType: "national"
  };
}

app.get('/debug', async (req, res) => {
  try {
    const raw = await fetchPagina(1, 50);
    res.json(raw);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/rdo', async (req, res) => {
  try {

    const campo = req.query.campo || 'dataPubblicazione';
    const verso = req.query.verso || 'desc';
    const ITEMS = 100;

    const first = await fetchPagina(1, ITEMS, campo, verso);

    const lista1 = findLista(first) || [];
    const totale = findTotale(first) || lista1.length;

    console.log(`Totale RdO disponibili: ${totale}`);

    let tuttiRdo = [...lista1];
   const rdoNormalizzate = tuttiRdo.map(r => {
  const rdo = normalizzaMepa(r);

  rdo.regioneStimata = stimaRegione(rdo);

  return rdo;
});

    console.log(`Totale RdO caricate: ${rdoNormalizzate.length}`);

    res.json({
  listaRdoAperte: rdoNormalizzate,
  totaleDisponibile: totale,
  totaleCaricato: rdoNormalizzate.length
});

  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`MEPA Proxy running on port ${PORT}`);
});
