const comuni = require('./comuni.json');

const COMUNI_REGIONI = {};

for (const c of comuni) {
  if (c.nome && c.regione?.nome) {
    COMUNI_REGIONI[c.nome.toUpperCase()] = c.regione.nome;
  }
}
const ALIAS_REGIONI = {
    "PIEMONTE": "Piemonte",
  "VALLE D'AOSTA": "Valle d'Aosta",
  "LOMBARDIA": "Lombardia",
  "TRENTINO": "Trentino-Alto Adige/Südtirol",
  "ALTO ADIGE": "Trentino-Alto Adige/Südtirol",
  "VENETO": "Veneto",
  "FRIULI": "Friuli-Venezia Giulia",
  "LIGURIA": "Liguria",
  "EMILIA ROMAGNA": "Emilia-Romagna",
  "EMILIA-ROMAGNA": "Emilia-Romagna",
  "TOSCANA": "Toscana",
  "UMBRIA": "Umbria",
  "MARCHE": "Marche",
  "LAZIO": "Lazio",
  "ABRUZZO": "Abruzzo",
  "MOLISE": "Molise",
  "CAMPANIA": "Campania",
  "PUGLIA": "Puglia",
  "BASILICATA": "Basilicata",
  "CALABRIA": "Calabria",
  "SICILIA": "Sicilia",
  "SARDEGNA": "Sardegna",
  "REGIONE SICILIA": "Sicilia",
  "SICILIA": "Sicilia",
  "ASREM": "Molise",
  "MOLISE": "Molise",
  "AZIENDA SANITARIA REGIONALE DEL MOLISE": "Molise",
  "VALLE D'AOSTA": "Valle d'Aosta",
  "AUSL VALLE D'AOSTA": "Valle d'Aosta"
};

function normalizzaTesto(testo) {
  return String(testo || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stimaRegione(rdo) {
  const testo = normalizzaTesto([
    rdo.descrizioneEnte || '',
    rdo.stazioneAppaltante || '',
    rdo.enteCommittente || '',
    rdo.titoloBando || '',
    rdo.descrizioneBando || '',
    rdo.descrizione || ''
  ].join(' '));

  for (const alias in ALIAS_REGIONI) {
    const aliasNorm = normalizzaTesto(alias);
    const regexAlias = new RegExp(`\\b${aliasNorm}\\b`, 'i');

    if (regexAlias.test(testo)) {
      return ALIAS_REGIONI[alias];
    }
  }

  const comuniOrdinati = Object.keys(COMUNI_REGIONI).sort((a, b) => b.length - a.length);

  for (const comune of comuniOrdinati) {
    const comuneNorm = normalizzaTesto(comune);
    const regexComune = new RegExp(`\\b${comuneNorm}\\b`, 'i');

    if (regexComune.test(testo)) {
      return COMUNI_REGIONI[comune];
    }
  }

  return '';
}

module.exports = { stimaRegione };
