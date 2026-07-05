// Parser de OFX 1.x / SGML (versão 102). As tags-folha não têm fechamento
// (ex.: "<TRNAMT>-34.00"), então extraímos por regex até o próximo "<" ou quebra de linha.

function decodeEntities(value) {
	return String(value || "")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/&apos;/gi, "'")
		.trim();
}

function matchTag(text, tag) {
	const m = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i").exec(text);
	return m ? m[1].trim() : "";
}

// "20260530000000[-3:BRT]" ou "20260613" -> "2026-05-30"
function parseOfxDate(value) {
	const digits = String(value || "").replace(/[^0-9]/g, "");
	if (digits.length < 8) return null;
	return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

// "Mercadolivre - Parcela 4/10" -> { parcelaAtual: 4, parcelaTotal: 10 }
function parseParcela(memo) {
	const m = /(\d+)\s*\/\s*(\d+)/.exec(String(memo || ""));
	if (!m) return { parcelaAtual: null, parcelaTotal: null };
	const atual = Number(m[1]);
	const total = Number(m[2]);
	if (!total || total < atual || total > 99) return { parcelaAtual: null, parcelaTotal: null };
	return { parcelaAtual: atual, parcelaTotal: total };
}

export function parseOfx(raw) {
	const text = String(raw || "");
	const bodyStart = text.indexOf("<OFX>");
	const body = bodyStart >= 0 ? text.slice(bodyStart) : text;

	const isCredit = /<CCSTMTRS>/i.test(body) || /<CREDITCARDMSGSRSV1>/i.test(body);
	const accountType = isCredit ? "credit" : "checking";

	const acctId = matchTag(body, "ACCTID");
	const curdef = matchTag(body, "CURDEF");
	const dtStart = parseOfxDate(matchTag(body, "DTSTART"));
	const dtEnd = parseOfxDate(matchTag(body, "DTEND"));

	const transactions = [];
	const blocks = body.split(/<STMTTRN>/i).slice(1);
	for (const block of blocks) {
		const chunk = block.split(/<\/STMTTRN>/i)[0];
		const fitid = matchTag(chunk, "FITID");
		const amountStr = matchTag(chunk, "TRNAMT").replace(",", ".");
		const amount = parseFloat(amountStr);
		if (!Number.isFinite(amount)) continue;
		const date = parseOfxDate(matchTag(chunk, "DTPOSTED"));
		const trntype = matchTag(chunk, "TRNTYPE");
		const memo = decodeEntities(matchTag(chunk, "MEMO"));
		const name = decodeEntities(matchTag(chunk, "NAME"));
		const { parcelaAtual, parcelaTotal } = parseParcela(memo);

		transactions.push({
			fitid,
			amount,
			date,
			trntype,
			memo,
			name,
			parcelaAtual,
			parcelaTotal,
			descricao: memo || name || "",
		});
	}

	return { accountType, acctId, curdef, dtStart, dtEnd, transactions };
}
