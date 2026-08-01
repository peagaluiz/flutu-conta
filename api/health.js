export default function handler(req, res) {
	if (req.method === "POST") {
		res.status(200).json({ ok: true, method: "POST" });
		return;
	}
	res.status(200).json({ ok: true, method: "GET", ts: Date.now() });
}
