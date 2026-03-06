import { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [activeRole, setActiveRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            try {
                // Now we just call /me and let the HttpOnly cookie handle authentication
                const res = await api.get('/api/auth/me');
                setUser(res.data);
                setActiveRole(res.data.role);
            } catch (error) {
                // Not authenticated or token expired
                console.log('User not authenticated on init');
            } finally {
                setLoading(false);
            }
        };
        initAuth();
    }, []);

    const login = async (username, password) => {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        // This will set the HttpOnly cookie upon success
        await api.post('/api/auth/token', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        // Fetch full user details using the newly set cookie
        const userRes = await api.get('/api/auth/me');
        setUser(userRes.data);
        setActiveRole(userRes.data.role);
        return userRes.data;
    };

    const logout = async () => {
        try {
            await api.post('/api/auth/logout');
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            setUser(null);
            setActiveRole(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, activeRole, setActiveRole, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
