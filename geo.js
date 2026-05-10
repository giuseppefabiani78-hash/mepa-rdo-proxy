const comuni = require('./comuni.json');

const COMUNI_REGIONI = {};

for (const c of comuni) {
  if (c.nome && c.regione?.nome) {
    COMUNI_REGIONI[c.nome.toUpperCase()] = c.regione.nome;
  }
}
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
