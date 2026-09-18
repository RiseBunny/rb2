/**
 * Levenshtein Distance (Edit Distance) implementation
 * Returns the minimum number of single-character edits (insertions, deletions, substitutions)
 * required to change one string into the other.
 */
function levenshteinDistance(a, b) {
  if (!a || !b) return Infinity;
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Calculate similarity ratio (0-100) between two strings
 */
function similarityRatio(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 100;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  return Math.round((1 - distance / maxLen) * 100);
}

/**
 * Collect all searchable command identifiers from the client
 * Returns array of { canonical, name, aliases: string[] }
 */
function collectCommandTargets(client) {
  const targets = [];
  const seen = new Set();

  for (const [canonical, cmd] of client.commands) {
    if (!canonical) continue;
    const names = [canonical];
    if (cmd.conf?.aliases) names.push(...cmd.conf.aliases);
    if (cmd.help?.name && cmd.help.name !== canonical) names.push(cmd.help.name);

    const uniqueNames = [...new Set(names.map(n => String(n).toLowerCase()))];
    for (const name of uniqueNames) {
      if (seen.has(name)) continue;
      seen.add(name);
      targets.push({ canonical, name, aliases: uniqueNames.filter(n => n !== name) });
    }
  }

  for (const [alias, canonical] of client.aliases) {
    const c = String(canonical).toLowerCase();
    const a = String(alias).toLowerCase();
    if (seen.has(a)) continue;
    seen.add(a);
    targets.push({ canonical: c, name: a, aliases: [] });
  }

  // Include English command names/aliases from KOMUTLAR for fuzzy matching
  try {
    const { KOMUTLAR } = require("../dil/komutlar");
    for (const [canonical, info] of Object.entries(KOMUTLAR)) {
      const c = String(canonical).toLowerCase();
      if (info.en) {
        const en = String(info.en).toLowerCase();
        if (!seen.has(en)) {
          seen.add(en);
          targets.push({ canonical: c, name: en, aliases: [] });
        }
      }
      if (info.enAlias) {
        for (const enAlias of info.enAlias) {
          const ea = String(enAlias).toLowerCase();
          if (!seen.has(ea)) {
            seen.add(ea);
            targets.push({ canonical: c, name: ea, aliases: [] });
          }
        }
      }
    }
  } catch {}
  return targets;
}

/**
 * Find the closest matching command for a given input
 * @param {string} input - User's command input (without prefix)
 * @param {Client} client - Discord client with commands/aliases
 * @param {number} threshold - Minimum similarity percentage (default 50)
 * @returns {Object|null} { canonical, matchedName, similarity } or null
 */
function findClosestCommand(input, client, threshold = 50) {
  if (!input || !client) return null;
  const targets = collectCommandTargets(client);
  if (!targets.length) return null;

  const normalizedInput = String(input).toLowerCase().trim();

  let best = null;
  let bestScore = 0;

  for (const target of targets) {
    const score = similarityRatio(normalizedInput, target.name);
    if (score > bestScore) {
      bestScore = score;
      best = { canonical: target.canonical, matchedName: target.name, similarity: score };
    }
    for (const alias of target.aliases) {
      const aliasScore = similarityRatio(normalizedInput, alias);
      if (aliasScore > bestScore) {
        bestScore = aliasScore;
        best = { canonical: target.canonical, matchedName: alias, similarity: aliasScore };
      }
    }
  }

  if (best && bestScore >= threshold) return best;
  return null;
}

module.exports = { levenshteinDistance, similarityRatio, collectCommandTargets, findClosestCommand };