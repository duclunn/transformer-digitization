import React, { useState, useEffect } from 'react';
import {
    Container, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Box, Alert, Tooltip
} from '@mui/material';
import { PlusCircle, Edit, Trash2, Upload, FileSpreadsheet } from 'lucide-react';
import api from '../services/api';

export default function MaterialCodes() {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');

    // Modal states
    const [openModal, setOpenModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        material_code: '',
        old_code: '',
        name: '',
        unit: 'kg',
        material_type: '',
    });

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            const response = await api.get('/api/inventory/materials');
            setMaterials(response.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch material codes');
            setLoading(false);
        }
    };

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                material_code: item.material_code,
                old_code: item.old_code || '',
                name: item.name,
                unit: item.unit || 'kg',
                material_type: item.material_type || '',
            });
        } else {
            setEditingItem(null);
            setFormData({
                material_code: '',
                old_code: '',
                name: '',
                unit: 'kg',
                material_type: '',
            });
        }
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        setEditingItem(null);
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
            if (editingItem) {
                await api.put(`/api/inventory/materials/${editingItem.id}`, formData);
            } else {
                await api.post('/api/inventory/materials', formData);
            }
            fetchMaterials();
            handleCloseModal();
            setSuccessMsg('Successfully saved material code!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'An error occurred while saving.');
        }
    };

    const handleDelete = async (id, code) => {
        if (window.confirm(`Are you sure you want to delete material code: ${code}?`)) {
            try {
                await api.delete(`/api/inventory/materials/${id}`);
                fetchMaterials();
                setSuccessMsg('Deleted successfully!');
                setTimeout(() => setSuccessMsg(''), 3000);
            } catch (err) {
                setError(err.response?.data?.detail || 'Failed to delete material');
                setTimeout(() => setError(null), 3000);
            }
        }
    };

    // --- Excel Upload logic ---
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setError(null);
        setSuccessMsg('Uploading and processing...');

        try {
            const res = await api.post('/api/inventory/materials/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchMaterials();
            setSuccessMsg(res.data.message);
            setTimeout(() => setSuccessMsg(''), 5000);
        } catch (err) {
            setSuccessMsg('');
            setError(err.response?.data?.detail || 'Failed to process Excel file');
        }

        // Reset file input
        e.target.value = null;
    };

    if (loading) return <Container sx={{ mt: 4 }}><Typography>Loading...</Typography></Container>;

    return (
        <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight={700} color="primary.dark">
                    Mã vật tư
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        component="label"
                        startIcon={<FileSpreadsheet size={18} />}
                        sx={{ bgcolor: 'white' }}
                    >
                        Import Excel
                        <input type="file" hidden accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<PlusCircle size={18} />}
                        onClick={() => handleOpenModal()}
                    >
                        Thêm mới
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
            {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}

            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 3 }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: 'grey.100' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Old Code</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Đơn vị tính (Unit)</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {materials.map((item) => (
                            <TableRow key={item.id} hover>
                                <TableCell sx={{ fontWeight: 500 }}>{item.material_code}</TableCell>
                                <TableCell>{item.old_code || '—'}</TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>{item.unit}</TableCell>
                                <TableCell>{item.material_type || '—'}</TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Edit">
                                        <IconButton size="small" color="primary" onClick={() => handleOpenModal(item)}>
                                            <Edit size={16} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                        <IconButton size="small" color="error" onClick={() => handleDelete(item.id, item.material_code)}>
                                            <Trash2 size={16} />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                        {materials.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                    No material codes found. Click "Import Excel" to upload a batch.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create/Edit Modal */}
            <Dialog open={openModal} onClose={handleCloseModal} maxWidth="sm" fullWidth>
                <form onSubmit={handleSubmit}>
                    <DialogTitle sx={{ fontWeight: 600 }}>
                        {editingItem ? 'Edit Material Code' : 'New Material Code'}
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField
                                    label="Code (Mã vật tư)"
                                    name="material_code"
                                    required
                                    fullWidth
                                    value={formData.material_code}
                                    onChange={handleInputChange}
                                />
                                <TextField
                                    label="Old Code (Mã cũ)"
                                    name="old_code"
                                    fullWidth
                                    value={formData.old_code}
                                    onChange={handleInputChange}
                                />
                            </Box>
                            <TextField
                                label="Name (Tên vật tư)"
                                name="name"
                                required
                                fullWidth
                                value={formData.name}
                                onChange={handleInputChange}
                            />
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField
                                    label="Đơn vị tính (Unit)"
                                    name="unit"
                                    required
                                    fullWidth
                                    value={formData.unit}
                                    onChange={handleInputChange}
                                />
                                <TextField
                                    label="Type (Loại)"
                                    name="material_type"
                                    fullWidth
                                    value={formData.material_type}
                                    onChange={handleInputChange}
                                />
                            </Box>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, pt: 0 }}>
                        <Button onClick={handleCloseModal}>Cancel</Button>
                        <Button type="submit" variant="contained" color="primary">
                            {editingItem ? 'Save Changes' : 'Create'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Container>
    );
}
