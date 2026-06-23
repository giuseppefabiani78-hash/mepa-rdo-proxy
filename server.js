const express = require('express');
const cors = require('cors');
const { stimaRegione } = require('./geo');

const app = express();
const PORT = process.env.PORT || 3000;

const MEPA_URL = 'https://www.acquistinretepa.it/publicservices/vetrineservices/getAltriBandiRdoAperte';
const ADI_URL = 'https://www.acquistinretepa.it/adi/api/v1/vetrina/ricerca';

let cacheRdo = {};
const CACHE_DURATION = 5 * 60 * 1000;

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
    service: 'MEPA Vetrina Bandi Proxy',
    timestamp: new Date().toISOString()
  });
});

async function fetchPagina(pagina, itemPagina = 100, campo = 'dataPubblicazione', verso = 'desc', filter = 'RDO') {
  const payload = {
    isArchive: false,
    strumento: [
      filter === 'ADI'
        ? { label: 'AVVISI DI INDAGINE', totale: 1, id: 6 }
        : { label: 'RDO APERTE', totale: 1, id: 1 }
    ],
    categoria: [],
    idt: '',
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
      'Referer': `https://www.acquistinretepa.it/opencms/opencms/vetrina_bandi.html?filter=${filter}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchPaginaAdi(pagina, itemPagina = 20, campo = 'dtInizio', verso = 'desc') {
  const payload = {
    nmAvviso: '',
    isArchive: false,
    dataPubblicazione: null,
    dataFine: null,
    stazioneAppaltante: '',
    enteCommittente: '',
    mostra: '',
    categoria: [],
    stato: [],
    orderBy: { campo, verso },
    paginazione: { pagina, itemPagina, totaleIniziative: 0 },
    strumento: [
      {
        id: 'AVVISO_DI_INDAGINE',
        label: 'Avviso di Indagine',
        totale: 0
      }
    ],
    tempo: { dataDa: null, dataA: null }
  };

  const response = await fetch(ADI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Origin': 'https://www.acquistinretepa.it',
      'Referer': 'https://www.acquistinretepa.it/opencms/opencms/vetrina_bandi.html?filter=ADI',
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

function normalizzaMepa(r, filter = 'RDO') {
  return {
    ...r,
    source: filter === 'ADI' ? 'MEPA_AVVISI_INDAGINE' : 'MEPA_RDO',
    sourceLabel: filter === 'ADI' ? 'Avvisi di Indagine MePA' : 'RdO Aperte MePA',
    sourceType: 'national'
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

app.get('/debug-adi', async (req, res) => {
  try {
    const raw = await fetchPaginaAdi(
  1,
  20
);

    res.json(raw);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

async function handleVetrinaBandi(req, res, filter = 'RDO') {
  try {
    const campo = req.query.campo || 'dataPubblicazione';
    const verso = req.query.verso || 'desc';
    const ITEMS = 100;

    const cacheKey = `${filter}-${campo}-${verso}`;
    const cached = cacheRdo[cacheKey];

    if (cached && (Date.now() - cached.time < CACHE_DURATION)) {
      return res.json({
        ...cached.data,
        cache: 'HIT'
      });
    }

    const first = await fetchPagina(1, ITEMS, campo, verso, filter);
    const lista1 = findLista(first) || [];
    const totale = findTotale(first) || lista1.length;

    let tuttiRdo = [...lista1];

    if (totale > ITEMS) {
      const pagine = Math.ceil(totale / ITEMS);
      const promises = [];

      for (let p = 2; p <= pagine; p++) {
        promises.push(fetchPagina(p, ITEMS, campo, verso, filter));
      }

      const results = await Promise.all(promises);

      for (const r of results) {
        const lista = findLista(r) || [];
        tuttiRdo = tuttiRdo.concat(lista);
      }
    }

    const listaNormalizzata = tuttiRdo.map(r => {
      const item = normalizzaMepa(r, filter);
      item.regioneStimata = stimaRegione(item);
      return item;
    });

    const responseData = {
      fonte: filter === 'ADI' ? 'Avvisi di Indagine MePA' : 'RdO Aperte MePA',
      filter,
      listaRdoAperte: listaNormalizzata,
      totaleDisponibile: totale,
      totaleCaricato: listaNormalizzata.length,
      cache: 'MISS',
      aggiornato: new Date().toISOString()
    };

    cacheRdo[cacheKey] = {
      time: Date.now(),
      data: responseData
    };

    res.json(responseData);

  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

app.get('/rdo', (req, res) => {
  handleVetrinaBandi(req, res, 'RDO');
});

app.get('/avvisi-indagine', (req, res) => {
  handleVetrinaBandi(req, res, 'ADI');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'MEPA Vetrina Bandi Proxy',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`MEPA Proxy running on port ${PORT}`);
});
