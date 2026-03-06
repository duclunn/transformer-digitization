import React, { useState, useEffect } from 'react';
import {
    Container, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Box, Alert, Checkbox
} from '@mui/material';
import { Shield, Save } from 'lucide-react';
import api from '../services/api';

const ALL_MODULES = [
    "Dashboard & Thống kê",
    "QL Thông tin sản xuất",
    "Quản lý bán hàng",
    "Quản lý sản xuất",
    "Sản xuất (MES)",
    "Truy xuất nguồn gốc",
    "Quản trị hệ thống",
    "Data Upload"
];

// Map backend role IDs/Names to user friendly Vietnamese Display Names
const ROLE_NAMES = {
    "admin": "Quản trị viên (Admin)",
    "sales": "Nhân viên Kinh doanh (Sales)",
    "production": "Nhân viên Sản xuất (Production)",
    "planning": "Nhân viên Kế hoạch (Planning)",
    "technical": "Nhân viên Kỹ thuật (Technical)"
};

export default function RoleManagement() {
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    // Make a local copy of permissions to edit
    const [editedPermissions, setEditedPermissions] = useState({});

    useEffect(() => {
        fetchPermissions();
    }, []);

    const fetchPermissions = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/auth/permissions');
            // Format into an object { roleName: [module1, module2] }
            const permObj = {};
            response.data.forEach(p => {
                permObj[p.role] = p.allowed_modules;
            });
            setPermissions(response.data);
            setEditedPermissions(permObj);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch permissions');
            setLoading(false);
        }
    };

    const handleCheckboxChange = (role, module) => {
        setEditedPermissions(prev => {
            const currentModules = prev[role] || [];
            if (currentModules.includes(module)) {
                return { ...prev, [role]: currentModules.filter(m => m !== module) };
            } else {
                return { ...prev, [role]: [...currentModules, module] };
            }
        });
    };

    const handleSave = async (role) => {
        setError(null);
        setSuccessMsg(null);
        try {
            await api.put(`/api/auth/permissions/${role}`, {
                allowed_modules: editedPermissions[role] || []
            });
            setSuccessMsg(`Đã cập nhật quyền cho nhóm: ${ROLE_NAMES[role] || role}`);
            fetchPermissions(); // Refresh
        } catch (err) {
            setError(`Lỗi cập nhật quyền cho ${role}: ${err.response?.data?.detail || err.message}`);
        }
    };

    if (loading) return <Container sx={{ mt: 4 }}><Typography>Loading...</Typography></Container>;

    // We only care about standard roles for this system, but we'll render whatever roles The DB has
    const rolesToRender = Object.keys(ROLE_NAMES);

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight={700} color="primary.dark" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Shield size={28} />
                    Phân quyền Hệ thống
                </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
            {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
                Quản lý quyền truy cập các chức năng trên thanh menu bên trái (Sidebar) cho từng nhóm người dùng.
            </Typography>

            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 3, overflowX: 'auto' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.100' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, minWidth: 200 }}>Phân hệ / Chức năng</TableCell>
                            {rolesToRender.map(role => (
                                <TableCell key={role} align="center" sx={{ fontWeight: 600 }}>
                                    {ROLE_NAMES[role]}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {ALL_MODULES.map((module) => (
                            <TableRow key={module} hover>
                                <TableCell sx={{ fontWeight: 500 }}>{module}</TableCell>
                                {rolesToRender.map(role => (
                                    <TableCell key={`${role}-${module}`} align="center">
                                        <Checkbox
                                            checked={(editedPermissions[role] || []).includes(module)}
                                            onChange={() => handleCheckboxChange(role, module)}
                                            color="primary"
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                {rolesToRender.map(role => {
                    // Check if edited
                    const original = permissions.find(p => p.role === role)?.allowed_modules || [];
                    const current = editedPermissions[role] || [];
                    // Simple array comparison
                    const isChanged = original.length !== current.length || !original.every(m => current.includes(m));

                    if (isChanged) {
                        return (
                            <Button
                                key={`save-${role}`}
                                variant="contained"
                                color="secondary"
                                startIcon={<Save size={18} />}
                                onClick={() => handleSave(role)}
                            >
                                Lưu quyền: {ROLE_NAMES[role]}
                            </Button>
                        )
                    }
                    return null;
                })}
            </Box>
        </Container>
    );
}
