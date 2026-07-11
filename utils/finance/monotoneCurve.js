const formatCoordinate = (value) => String(Number(value.toFixed(2)));

function hasValidCoordinates(points) {
	return points.every((point, index) => {
		if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return false;
		return index === 0 || point.x > points[index - 1].x;
	});
}

function computeTangents(points) {
	const slopes = points.slice(0, -1).map((point, index) => {
		const next = points[index + 1];
		return (next.y - point.y) / (next.x - point.x);
	});
	const tangents = [slopes[0]];

	for (let index = 1; index < points.length - 1; index += 1) {
		const before = slopes[index - 1];
		const after = slopes[index];

		if (before === 0 || after === 0 || before * after <= 0) {
			tangents.push(0);
			continue;
		}

		const beforeWidth = points[index].x - points[index - 1].x;
		const afterWidth = points[index + 1].x - points[index].x;
		const firstWeight = 2 * afterWidth + beforeWidth;
		const secondWeight = afterWidth + 2 * beforeWidth;
		tangents.push(
			(firstWeight + secondWeight) /
				(firstWeight / before + secondWeight / after)
		);
	}

	tangents.push(slopes[slopes.length - 1]);
	return tangents;
}

export function buildMonotonePath(points) {
	if (!Array.isArray(points) || points.length < 2 || !hasValidCoordinates(points)) {
		return "";
	}

	const tangents = computeTangents(points);
	let path = `M ${formatCoordinate(points[0].x)} ${formatCoordinate(points[0].y)}`;

	for (let index = 0; index < points.length - 1; index += 1) {
		const current = points[index];
		const next = points[index + 1];
		const width = next.x - current.x;
		const control1X = current.x + width / 3;
		const control1Y = current.y + (tangents[index] * width) / 3;
		const control2X = next.x - width / 3;
		const control2Y = next.y - (tangents[index + 1] * width) / 3;

		path += ` C ${formatCoordinate(control1X)} ${formatCoordinate(control1Y)}, ${formatCoordinate(control2X)} ${formatCoordinate(control2Y)}, ${formatCoordinate(next.x)} ${formatCoordinate(next.y)}`;
	}

	return path;
}
