import { useEffect } from "react";
import { router } from "expo-router";

export default function InsertTab() {
	useEffect(() => {
		router.push("/(stack)/insert");
	}, []);

	return null;
}
