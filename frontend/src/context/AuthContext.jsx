import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchMe = useCallback(async () => {
        const token = localStorage.getItem("pulse_token");
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const { data } = await api.get("/auth/me");
            setUser(data);
        } catch {
            localStorage.removeItem("pulse_token");
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchMe();
    }, [fetchMe]);

    // Presence heartbeat — ping /api/presence/heartbeat every 30s while user is logged in
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        const ping = () => {
            if (cancelled) return;
            api.post("/presence/heartbeat", { status: "online" }).catch(() => {});
        };
        ping(); // immediate
        const iv = setInterval(ping, 30000);
        const handleBeforeUnload = () => {
            try {
                const blob = new Blob([JSON.stringify({})], { type: "application/json" });
                const url = (process.env.REACT_APP_BACKEND_URL || "") + "/api/presence/offline";
                navigator.sendBeacon?.(url, blob);
            } catch {}
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            cancelled = true;
            clearInterval(iv);
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [user]);

    const login = async (email, password) => {
        const { data } = await api.post("/auth/login", { email, password });
        localStorage.setItem("pulse_token", data.token);
        setUser(data.user);
        return data.user;
    };

    const register = async (email, password, name) => {
        const { data } = await api.post("/auth/register", { email, password, name });
        localStorage.setItem("pulse_token", data.token);
        setUser(data.user);
        return data.user;
    };

    const googleLogin = async (idToken) => {
        const { data } = await api.post("/auth/google", { id_token: idToken });
        localStorage.setItem("pulse_token", data.token);
        setUser(data.user);
        return data.user;
    };

    const logout = () => {
        localStorage.removeItem("pulse_token");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
