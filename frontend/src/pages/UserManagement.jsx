import React, { useState, useEffect } from 'react';
import {
    Container, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    MenuItem, Select, FormControl, InputLabel, Chip, Box, Alert
} from '@mui/material';
import { UserPlus, Edit, Trash2, Mail, Shield, Briefcase, User as UserIcon } from 'lucide-react';
import api from '../services/api';

const ROLES = ['admin', 'sales', 'technical', 'production', 'planning'];
const DEPARTMENTS = ['Admin', 'Sales', 'Technical', 'Production', 'Planning'];

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [me, setMe] = useState(null);

    // Modal states
    const [openModal, setOpenModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: '',
        email: '',
        role: 'production',
        department: 'Production'
    });

    useEffect(() => {
        fetchUsers();
        fetchMe();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/api/auth/users');
            setUsers(response.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch users');
            setLoading(false);
        }
    };

    const fetchMe = async () => {
        try {
            const response = await api.get('/api/auth/me');
            setMe(response.data);
        } catch (err) { }
    };

    const handleOpenModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                username: user.username,
                password: '', // Don't show password
                name: user.name,
                email: user.email || '',
                role: user.role,
                department: user.department
            });
        } else {
            setEditingUser(null);
            setFormData({
                username: '',
                password: '',
                name: '',
                email: '',
                role: 'production',
                department: 'Production'
            });
        }
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        setEditingUser(null);
        setError(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            if (editingUser) {
                // Update
                const updateData = { ...formData };
                if (!updateData.password) delete updateData.password;
                await api.put(`/api/auth/users/${editingUser.id}`, updateData);
            } else {
                // Create
                await api.post('/api/auth/users', formData);
            }
            fetchUsers();
            handleCloseModal();
        } catch (err) {
            setError(err.response?.data?.detail || 'An error occurred');
        }
    };

    const handleDelete = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await api.delete(`/api/auth/users/${userId}`);
                fetchUsers();
            } catch (err) {
                alert(err.response?.data?.detail || 'Failed to delete user');
            }
        }
    };

    if (loading) return <Container sx={{ mt: 4 }}><Typography>Loading...</Typography></Container>;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight={700} color="primary.dark">
                    Quản trị người dùng
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<UserPlus size={18} />}
                    onClick={() => handleOpenModal()}
                >
                    Thêm người dùng
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 3 }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.100' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Tên đăng nhập</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Họ và tên</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Vai trò</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Phòng ban</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id} hover>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <UserIcon size={16} />
                                        {user.username}
                                        {me?.id === user.id && <Chip label="Bạn" size="small" color="primary" variant="outlined" sx={{ ml: 1 }} />}
                                    </Box>
                                </TableCell>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>{user.email || '—'}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={user.role}
                                        size="small"
                                        color={user.role === 'admin' ? 'secondary' : 'default'}
                                    />
                                </TableCell>
                                <TableCell>{user.department}</TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" color="primary" onClick={() => handleOpenModal(user)} sx={{ mr: 1 }}>
                                        <Edit size={18} />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleDelete(user.id)}
                                        disabled={me?.id === user.id}
                                    >
                                        <Trash2 size={18} />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create/Edit Modal */}
            <Dialog open={openModal} onClose={handleCloseModal} maxWidth="xs" fullWidth>
                <form onSubmit={handleSubmit}>
                    <DialogTitle sx={{ fontWeight: 600 }}>
                        {editingUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <TextField
                                label="Tên đăng nhập"
                                name="username"
                                fullWidth
                                required
                                value={formData.username}
                                onChange={handleInputChange}
                                disabled={!!editingUser}
                            />
                            <TextField
                                label={editingUser ? "Mật khẩu mới (để trống nếu không đổi)" : "Mật khẩu"}
                                name="password"
                                type="password"
                                fullWidth
                                required={!editingUser}
                                value={formData.password}
                                onChange={handleInputChange}
                            />
                            <TextField
                                label="Họ và tên"
                                name="name"
                                fullWidth
                                required
                                value={formData.name}
                                onChange={handleInputChange}
                            />
                            <TextField
                                label="Email"
                                name="email"
                                type="email"
                                fullWidth
                                value={formData.email}
                                onChange={handleInputChange}
                            />
                            <FormControl fullWidth required>
                                <InputLabel>Vai trò</InputLabel>
                                <Select
                                    name="role"
                                    value={formData.role}
                                    label="Vai trò"
                                    onChange={handleInputChange}
                                >
                                    {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth required>
                                <InputLabel>Phòng ban</InputLabel>
                                <Select
                                    name="department"
                                    value={formData.department}
                                    label="Phòng ban"
                                    onChange={handleInputChange}
                                >
                                    {DEPARTMENTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, pt: 0 }}>
                        <Button onClick={handleCloseModal}>Hủy</Button>
                        <Button type="submit" variant="contained" color="primary">
                            {editingUser ? 'Lưu thay đổi' : 'Tạo người dùng'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Container>
    );
}
