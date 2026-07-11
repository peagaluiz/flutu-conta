import { useCallback, useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

import { INACTIVITY_TIMEOUT_MS } from "@/constants/security";
import {
	clearLastActive,
	getLastActive,
	setLastActive,
} from "@/services/security/lastActiveStore";
import { useAuth } from "@/state/AuthContext";

const WEB_ACTIVITY_THROTTLE_MS = 5 * 1000;

export function useInactivityLock() {
	const { isLoggedIn, isReady, logOut } = useAuth();
	const timerRef = useRef(null);
	const expiringRef = useRef(false);
	const isLoggedInRef = useRef(isLoggedIn);
	const lastActiveRef = useRef(null);
	const logOutRef = useRef(logOut);
	const lastWebBumpRef = useRef(0);

	isLoggedInRef.current = isLoggedIn;
	logOutRef.current = logOut;

	const clearTimer = useCallback(() => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const expire = useCallback(async () => {
		if (!isLoggedInRef.current || expiringRef.current) return;

		expiringRef.current = true;
		clearTimer();

		try {
			await clearLastActive();
			await logOutRef.current();
		} catch (error) {
			expiringRef.current = false;
			console.error("Falha ao encerrar sessao inativa", error);
		}
	}, [clearTimer]);

	const scheduleTimer = useCallback(() => {
		clearTimer();
		if (!isLoggedInRef.current) return;

		timerRef.current = setTimeout(() => {
			void expire();
		}, INACTIVITY_TIMEOUT_MS);
	}, [clearTimer, expire]);

	const bump = useCallback(() => {
		if (!isLoggedInRef.current || expiringRef.current) return;

		const now = Date.now();
		lastActiveRef.current = now;
		void setLastActive(now);
		scheduleTimer();
	}, [scheduleTimer]);

	const reassess = useCallback(async () => {
		if (!isLoggedInRef.current || expiringRef.current) return;

		const storedLastActive = await getLastActive();
		if (!isLoggedInRef.current || expiringRef.current) return;
		const lastActive =
			lastActiveRef.current === null
				? storedLastActive
				: Math.max(lastActiveRef.current, storedLastActive ?? 0);

		if (
			lastActive !== null &&
			Date.now() - lastActive >= INACTIVITY_TIMEOUT_MS
		) {
			await expire();
			return;
		}

		bump();
	}, [bump, expire]);

	useEffect(() => {
		if (!isLoggedIn) {
			clearTimer();
			expiringRef.current = false;
			lastActiveRef.current = null;
			if (isReady) void clearLastActive();
			return;
		}

		void reassess();

		if (Platform.OS === "web") {
			const activityEvents = [
				"mousemove",
				"keydown",
				"click",
				"scroll",
				"touchstart",
			];
			const handleActivity = () => {
				const now = Date.now();
				if (now - lastWebBumpRef.current < WEB_ACTIVITY_THROTTLE_MS) return;

				lastWebBumpRef.current = now;
				bump();
			};
			const handleVisibilityChange = () => {
				if (document.visibilityState === "hidden") {
					const now = Date.now();
					lastActiveRef.current = now;
					void setLastActive(now);
					clearTimer();
					return;
				}

				void reassess();
			};
			const handleFocus = () => void reassess();

			activityEvents.forEach((eventName) => {
				window.addEventListener(eventName, handleActivity, { passive: true });
			});
			document.addEventListener("visibilitychange", handleVisibilityChange);
			window.addEventListener("focus", handleFocus);

			return () => {
				clearTimer();
				activityEvents.forEach((eventName) => {
					window.removeEventListener(eventName, handleActivity);
				});
				document.removeEventListener(
					"visibilitychange",
					handleVisibilityChange
				);
				window.removeEventListener("focus", handleFocus);
			};
		}

		const subscription = AppState.addEventListener("change", (nextState) => {
			if (nextState === "active") {
				void reassess();
				return;
			}

			const now = Date.now();
			lastActiveRef.current = now;
			void setLastActive(now);
			clearTimer();
		});

		return () => {
			clearTimer();
			subscription.remove();
		};
	}, [bump, clearTimer, isLoggedIn, isReady, reassess]);

	return { bump };
}
