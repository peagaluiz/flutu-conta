// Limpeza de descrição e nome de pessoa vindos do OFX (MEMO/NAME).

const SMALL_WORDS = new Set(["de", "da", "do", "das", "dos", "e"]);

// "LUIZ PHILIPE ROSA" / "luiz philipe rosa" -> "Luiz Philipe Rosa"
export function toTitleCase(text) {
	return String(text || "")
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean)
		.map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
		.join(" ");
}

// Chave para deduplicar pessoas (sem acento, minúsculo, espaços normalizados)
export function normalizePersonKey(name) {
	return String(name || "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();
}

// Parece documento/conta/parcela? (não é nome de pessoa)
function looksLikeNoise(seg) {
	const s = String(seg || "").trim();
	if (!s) return true;
	if (/parcela/i.test(s)) return true;
	if (/^[•\d.\/\-\s]+$/.test(s)) return true; // só dígitos/pontos/traços/bullet
	if (/ag[êe]ncia|conta:|cpf|cnpj/i.test(s)) return true;
	return false;
}

// Descrição enxuta: pega o rótulo do lançamento, sem documento/nome.
export function cleanDescription(memo) {
	const raw = String(memo || "").trim();
	if (!raw) return "";
	// 1º trecho antes de " - " e antes de ":" (tira "Pix recebido: ..." -> "Pix recebido")
	const firstSeg = raw.split(" - ")[0];
	let desc = firstSeg.split(":")[0].trim();
	// normaliza rótulos comuns de fatura
	if (/^pagamento\s+(de\s+)?fatura/i.test(desc)) desc = "Pagamento de fatura";
	return desc;
}

// Nome de pessoa: do NAME ou do 2º trecho do MEMO; remove rótulo antes de " - ", Title Case.
// `isCredit` = fatura de cartão (nesses casos o "nome" costuma ser o estabelecimento; não força).
export function cleanPersonName(rawName, memo, isCredit = false) {
	let candidate = String(rawName || "").trim();

	// "Pagamento Fatura - LUIZ PHILIPE ROSA" -> "LUIZ PHILIPE ROSA"
	if (candidate.includes(" - ")) {
		const segs = candidate.split(" - ").map((s) => s.trim());
		candidate = segs[segs.length - 1];
	}

	// Sem NAME: tenta o 2º trecho do MEMO (contraparte de pix em extrato de conta)
	if (!candidate && !isCredit && memo) {
		const segs = String(memo).split(" - ").map((s) => s.trim()).filter(Boolean);
		if (segs.length > 1 && !looksLikeNoise(segs[1])) candidate = segs[1];
	}

	if (!candidate || looksLikeNoise(candidate)) return "";
	return toTitleCase(candidate);
}
