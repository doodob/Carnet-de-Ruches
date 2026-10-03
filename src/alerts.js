// Alertes déduites des visites : ce qui mérite un coup d'œil, sans rien bloquer.
// `recent` : les deux dernières visites, la plus récente d'abord.

import { TEMPER_LABELS, daysFromToday, formatDay } from "./util.js";

// De mars à octobre, une ruche sans visite ni visite prévue depuis plus de 14 jours est signalée.
const STALE_DAYS = 14;
const inSeason = (date) => date.getMonth() >= 2 && date.getMonth() <= 9;

export function hiveAlerts({ status, recent = [], next_visit_on: next = null }, now = new Date()) {
  if (status !== "active") return [];
  const alerts = [];
  const [last, prev] = recent;

  if (next && daysFromToday(next, now) < 0) {
    alerts.push({ key: "planned", text: `Visite prévue le ${formatDay(next)}, pas encore faite.` });
  } else if (!next && last && inSeason(now)) {
    const days = Math.floor((now - new Date(last.inspected_at)) / 86400000);
    if (days > STALE_DAYS) alerts.push({ key: "stale", text: `Pas de visite depuis ${days} jours.` });
  }

  if (last?.queen_cells === true) {
    alerts.push({ key: "cells", text: "Cellules royales à la dernière visite : risque d'essaimage." });
  }

  if (last?.eggs_seen === false && prev?.eggs_seen === false) {
    alerts.push({ key: "eggs", text: "Pas d'œufs deux visites de suite : la ruche est peut-être orpheline." });
  }

  if (last?.temper != null && prev?.temper != null && last.temper > prev.temper && last.temper >= 4) {
    alerts.push({
      key: "temper",
      text: `Comportement qui se dégrade : ${TEMPER_LABELS[prev.temper].toLowerCase()}, puis ${TEMPER_LABELS[last.temper].toLowerCase()}.`,
    });
  }

  return alerts;
}
