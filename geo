const COMUNI_REGIONI = {
  "ROMA": "Lazio",
  "MILANO": "Lombardia",
  "NAPOLI": "Campania",
  "TORINO": "Piemonte",
  "PALERMO": "Sicilia",
  "BARI": "Puglia",
  "CAGLIARI": "Sardegna",
  "BOLOGNA": "Emilia-Romagna",
  "FIRENZE": "Toscana",
  "GENOVA": "Liguria",
  "VENEZIA": "Veneto",
  "ISOLA DI CAPO RIZZUTO": "Calabria",
  "MERCATO SARACENO": "Emilia-Romagna"
};

const ALIAS_REGIONI = {
  "REGIONE SICILIA": "Sicilia",
  "SICILIA": "Sicilia",
  "ASREM": "Molise",
  "MOLISE": "Molise",
  "AZIENDA SANITARIA REGIONALE DEL MOLISE": "Molise",
  "VALLE D'AOSTA": "Valle d'Aosta",
  "AUSL VALLE D'AOSTA": "Valle d'Aosta"
};

function stimaRegione(rdo) {
  const testo = [
    rdo.descrizioneEnte || '',
    rdo.stazioneAppaltante || '',
    rdo.enteCommittente || '',
    rdo.titoloBando || '',
    rdo.descrizioneBando || '',
    rdo.descrizione || ''
  ].join(' ').toUpperCase();

  for (const alias in ALIAS_REGIONI) {
    if (testo.includes(alias)) return ALIAS_REGIONI[alias];
  }

  for (const comune in COMUNI_REGIONI) {
    if (testo.includes(comune)) return COMUNI_REGIONI[comune];
  }

  return '';
}

module.exports = { stimaRegione };
