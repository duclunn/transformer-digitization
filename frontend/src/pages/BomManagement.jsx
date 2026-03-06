import { useState, useEffect } from 'react';
import { Container, Typography, Paper, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Modal, TextField, Grid, Chip, IconButton } from '@mui/material';
import { PlusCircle, ArrowLeft, Search, Eye } from 'lucide-react';
import api from '../services/api';

const modalStyle = {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    width: 700, bgcolor: 'background.paper', boxShadow: 24, p: 4, borderRadius: 2
};

export default function BomManagement() {
    // Orders State
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);

    // BOM State
    const [bomList, setBomList] = useState([]);
    const [openModal, setOpenModal] = useState(false);

    // Create form initialized for the selected order's model by default
    const [form, setForm] = useState({
        transformer_model: '', stt: 1, material_name: '', specification: '', unit: '', dinh_muc: 0, thuc_linh: 0, chenh_lech: 0, note: ''
    });

    useEffect(() => {
        if (!selectedOrder) {
            fetchOrders();
        } else {
            fetchBom(selectedOrder.transformer_model);
            setForm(prev => ({ ...prev, transformer_model: selectedOrder.transformer_model }));
        }
    }, [selectedOrder]);

    const fetchOrders = async () => {
        try {
            const res = await api.get('/api/sales/orders');
            setOrders(res.data);
        } catch (err) { console.error('Failed to fetch orders', err); }
    };

    const fetchBom = async (modelName) => {
        try {
            // Re-use existing endpoint by passing transformer_model query
            const res = await api.get(`/api/inventory/bom?transformer_model=${modelName}`);
            setBomList(res.data);
        } catch (err) { console.error('Failed to fetch BOM', err); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/inventory/bom', { ...form, chenh_lech: form.dinh_muc - form.thuc_linh });
            setOpenModal(false);
            setForm({ transformer_model: selectedOrder?.transformer_model || '', stt: bomList.length + 1, material_name: '', specification: '', unit: '', dinh_muc: 0, thuc_linh: 0, chenh_lech: 0, note: '' });
            fetchBom(selectedOrder.transformer_model);
        } catch (err) { alert('Error creating BOM entry'); }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("transformer_model", selectedOrder.transformer_model);
        formData.append("file", file);

        try {
            const res = await api.post('/api/inventory/bom/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(res.data.message || 'File uploaded successfully!');
            fetchBom(selectedOrder.transformer_model);
        } catch (err) {
            console.error("Upload error:", err);
            alert('Error uploading file: ' + (err.response?.data?.detail || err.message));
        } finally {
            e.target.value = null; // reset input
        }
    };

    if (!selectedOrder) {
        return (
            <Container maxWidth="xl" sx={{ mt: 2 }}>
                <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: 'primary.dark' }}>
                    Chọn Đơn Bán Hàng (Select Order for BOM)
                </Typography>

                <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                        <TextField size="small" placeholder="Search orders..." variant="outlined" InputProps={{ startAdornment: <Search size={20} style={{ marginRight: 8, color: 'gray' }} /> }} />
                    </Box>
                    <TableContainer>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: 'grey.100' }}>
                                <TableRow>
                                    <TableCell>Order ID</TableCell>
                                    <TableCell>Customer</TableCell>
                                    <TableCell>Transformer Model</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {orders.map(o => (
                                    <TableRow key={o.id} hover onClick={() => setSelectedOrder(o)} sx={{ cursor: 'pointer' }}>
                                        <TableCell fontWeight={600}>{o.order_id}</TableCell>
                                        <TableCell>{o.customer_name}</TableCell>
                                        <TableCell>{o.transformer_model}</TableCell>
                                        <TableCell><Chip size="small" label={o.status.toUpperCase()} color={o.status === 'pending' ? 'warning' : 'success'} /></TableCell>
                                        <TableCell align="right">
                                            <Button variant="outlined" size="small" startIcon={<Eye size={16} />}>
                                                View BOM
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {orders.length === 0 && <TableRow><TableCell colSpan={5} align="center">No active orders found.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Container>
        );
    }

    // Secondary View: BOM for specific order
    return (
        <Container maxWidth="xl" sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                <IconButton onClick={() => setSelectedOrder(null)} sx={{ bgcolor: 'white', boxShadow: 1 }}>
                    <ArrowLeft size={20} />
                </IconButton>
                <Box>
                    <Typography variant="h4" fontWeight={700} sx={{ color: 'primary.dark' }}>
                        Định mức NVL (BOM)
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        Order: <strong>{selectedOrder.order_id}</strong> | Model: <strong>{selectedOrder.transformer_model}</strong>
                    </Typography>
                </Box>
            </Box>

            <Paper sx={{ p: 3, mt: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 2 }}>
                    <input
                        accept=".xlsx, .xls, .csv"
                        style={{ display: 'none' }}
                        id="bom-upload-file"
                        type="file"
                        onChange={handleFileUpload}
                    />
                    <label htmlFor="bom-upload-file">
                        <Button variant="outlined" component="span">
                            Upload Excel
                        </Button>
                    </label>
                    <Button variant="contained" startIcon={<PlusCircle size={18} />} onClick={() => { setForm({ ...form, stt: bomList.length + 1 }); setOpenModal(true); }}>
                        Add BOM Entry
                    </Button>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: 'grey.100' }}>
                            <TableRow>
                                <TableCell>STT</TableCell>
                                <TableCell>Tên vật tư</TableCell>
                                <TableCell>Quy cách</TableCell>
                                <TableCell>ĐVT</TableCell>
                                <TableCell>Định mức</TableCell>
                                <TableCell>Thực lĩnh</TableCell>
                                <TableCell>Chênh lệch</TableCell>
                                <TableCell>Ghi chú</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {bomList.map(b => (
                                <TableRow key={b.id}>
                                    <TableCell>{b.stt}</TableCell>
                                    <TableCell fontWeight={600}>{b.material_name}</TableCell>
                                    <TableCell>{b.specification}</TableCell>
                                    <TableCell>{b.unit}</TableCell>
                                    <TableCell>{b.dinh_muc}</TableCell>
                                    <TableCell>{b.thuc_linh}</TableCell>
                                    <TableCell sx={{ color: b.chenh_lech < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>{b.chenh_lech}</TableCell>
                                    <TableCell>{b.note}</TableCell>
                                </TableRow>
                            ))}
                            {bomList.length === 0 && <TableRow><TableCell colSpan={8} align="center">No BOM entries defined for {selectedOrder.transformer_model}.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Modal open={openModal} onClose={() => setOpenModal(false)}>
                <Box sx={modalStyle}>
                    <Typography variant="h6" gutterBottom fontWeight={600}>Add BOM Entry for {form.transformer_model}</Typography>
                    <form onSubmit={handleCreate}>
                        <Grid container spacing={2}>
                            <Grid item xs={6}><TextField fullWidth disabled label="Transformer Model" value={form.transformer_model} /></Grid>
                            <Grid item xs={6}><TextField fullWidth required type="number" label="STT" value={form.stt} onChange={e => setForm({ ...form, stt: parseInt(e.target.value) })} /></Grid>
                            <Grid item xs={6}><TextField fullWidth required label="Tên vật tư" value={form.material_name} onChange={e => setForm({ ...form, material_name: e.target.value })} /></Grid>
                            <Grid item xs={6}><TextField fullWidth label="Quy cách" value={form.specification} onChange={e => setForm({ ...form, specification: e.target.value })} /></Grid>
                            <Grid item xs={4}><TextField fullWidth required label="ĐVT" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></Grid>
                            <Grid item xs={4}><TextField fullWidth required type="number" label="Định mức" value={form.dinh_muc} onChange={e => setForm({ ...form, dinh_muc: parseFloat(e.target.value) })} /></Grid>
                            <Grid item xs={4}><TextField fullWidth type="number" label="Thực lĩnh" value={form.thuc_linh} onChange={e => setForm({ ...form, thuc_linh: parseFloat(e.target.value) })} /></Grid>
                            <Grid item xs={12}><TextField fullWidth label="Ghi chú" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></Grid>
                            <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                <Button onClick={() => setOpenModal(false)}>Cancel</Button>
                                <Button variant="contained" type="submit">Save</Button>
                            </Grid>
                        </Grid>
                    </form>
                </Box>
            </Modal>
        </Container>
    );
}
