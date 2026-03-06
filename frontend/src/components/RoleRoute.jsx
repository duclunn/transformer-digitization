import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, Typography } from '@mui/material';
import { ShieldAlert } from 'lucide-react';

export default function RoleRoute({ allowedRoles }) {
    const { user, activeRole } = useAuth();
    const currentRole = activeRole || (user ? user.role : null);

    // If the user's role is not in the allowed list, render access denied
    if (user && !allowedRoles.includes(currentRole)) {
        return (
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10 }}>
                <ShieldAlert size={64} color="#d32f2f" style={{ marginBottom: 16 }} />
                <Typography variant="h4" color="error" gutterBottom>
                    Access Denied
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    You do not have permission to view this page based on your role ({currentRole}).
                </Typography>
            </Box>
        );
    }

    // Otherwise, render the requested route
    return <Outlet />;
}
