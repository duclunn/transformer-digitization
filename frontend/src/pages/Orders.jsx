import { useState, useEffect, useMemo } from 'react';
import { Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Modal, TextField, Chip, TableSortLabel, IconButton, Tooltip, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { PlusCircle, Search, Edit2, Upload, X, Trash2 } from 'lucide-react';
import api from '../services/api';

const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: 1100,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    borderRadius: 2,
    maxHeight: '85vh',
    overflowY: 'auto'
};

const shrink = { shrink: true };

const emptyRow = () => ({
    order_id: '',
    customer_code: '',
    customer_name: '',
    transformer_model: '',
    model_name: '',
    quantity: 1,
    order_date: new Date().toISOString().split('T')[0],
    deadline_date: '',
    requirement_file: null
});

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [orderRows, setOrderRows] = useState([emptyRow()]);
    const [editForm, setEditForm] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [ordRes, custRes] = await Promise.all([
                api.get('/api/sales/orders'),
                api.get('/api/sales/customers')
            ]);
            setOrders(ordRes.data);
            setCustomers(custRes.data);
        } catch (err) { console.error("Failed to fetch data", err); }
    };

    // --- Stable STT Calculation ---
    // Sort all raw orders by date ascending to assign a permanent STT index
    const ordersWithStt = useMemo(() => {
        const sortedByDate = [...orders].sort((a, b) => new Date(a.order_date) - new Date(b.order_date));
        return sortedByDate.map((o, index) => ({ ...o, stt: index + 1 }));
    }, [orders]);

    // --- Suggestion lists ---
    const customerNameSuggestions = useMemo(() => {
        const fromCustomers = customers.map(c => c.name);
        const fromOrders = orders.map(o => o.customer_name);
        return [...new Set([...fromCustomers, ...fromOrders])].filter(Boolean);
    }, [customers, orders]);

    const customerCodeSuggestions = useMemo(() => {
        const fromCustomers = customers.map(c => c.customer_code);
        const fromOrders = orders.map(o => o.customer_code);
        return [...new Set([...fromCustomers, ...fromOrders])].filter(Boolean);
    }, [customers, orders]);

    const modelCodeSuggestions = useMemo(() => {
        return [...new Set(orders.map(o => o.transformer_model))].filter(Boolean);
    }, [orders]);

    const modelNameSuggestions = useMemo(() => {
        return [...new Set(orders.map(o => o.model_name))].filter(Boolean);
    }, [orders]);

    // --- Auto-fill logic for creation ---
    const handleCustomerChange = (idx, field, value) => {
        const updated = [...orderRows];
        updated[idx][field] = value || '';
        if (field === 'customer_code' && value) {
            const match = customers.find(c => c.customer_code === value) || orders.find(o => o.customer_code === value);
            if (match && match.name) updated[idx].customer_name = match.name;
        } else if (field === 'customer_name' && value) {
            const match = customers.find(c => c.name === value) || orders.find(o => o.customer_name === value);
            if (match && match.customer_code) updated[idx].customer_code = match.customer_code;
        }
        setOrderRows(updated);
    };

    const handleModelChange = (idx, field, value) => {
        const updated = [...orderRows];
        updated[idx][field] = value || '';
        if (field === 'transformer_model' && value) {
            const match = orders.find(o => o.transformer_model === value && o.model_name);
            if (match) updated[idx].model_name = match.model_name;
        } else if (field === 'model_name' && value) {
            const match = orders.find(o => o.model_name === value && o.transformer_model);
            if (match) updated[idx].transformer_model = match.transformer_model;
        }
        setOrderRows(updated);
    };

    // --- Create multiple orders ---
    const handleAddRow = () => setOrderRows([...orderRows, emptyRow()]);
    const handleRemoveRow = (idx) => setOrderRows(orderRows.filter((_, i) => i !== idx));
    const updateRow = (idx, field, value) => {
        const updated = [...orderRows];
        updated[idx] = { ...updated[idx], [field]: value };
        setOrderRows(updated);
    };

    const handleCreateOrders = async (e) => {
        e.preventDefault();
        try {
            for (const row of orderRows) {
                const formattedDate = new Date(row.order_date).toISOString();
                const formattedDeadline = new Date(row.deadline_date).toISOString();
                const res = await api.post('/api/sales/orders', { ...row, order_date: formattedDate, deadline_date: formattedDeadline, requirement_file: null });
                if (row.requirement_file) {
                    const formData = new FormData();
                    formData.append('file', row.requirement_file);
                    await api.post(`/api/sales/orders/${res.data.order_id}/upload-requirement`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }
            }
            setOpenCreateModal(false);
            setOrderRows([emptyRow()]);
            fetchData();
        } catch (err) {
            alert("Error creating order: " + (err.response?.data?.detail || err.message));
        }
    };

    // --- Edit order ---
    const openEditForOrder = (order) => {
        setEditForm({
            original_order_id: order.order_id,
            order_id: order.order_id,
            customer_code: order.customer_code || '',
            customer_name: order.customer_name || '',
            transformer_model: order.transformer_model || '',
            model_name: order.model_name || '',
            quantity: order.quantity,
            order_date: order.order_date ? new Date(order.order_date).toISOString().split('T')[0] : '',
            deadline_date: order.deadline_date ? new Date(order.deadline_date).toISOString().split('T')[0] : '',
            status: order.status || 'pending',
            requirement_file: null,
            existing_file: order.requirement_file
        });
        setOpenEditModal(true);
    };

    const handleEditCustomerChange = (field, value) => {
        setEditForm(prev => {
            const updated = { ...prev, [field]: value || '' };
            if (field === 'customer_code' && value) {
                const match = customers.find(c => c.customer_code === value) || orders.find(o => o.customer_code === value);
                if (match && match.name) updated.customer_name = match.name;
            } else if (field === 'customer_name' && value) {
                const match = customers.find(c => c.name === value) || orders.find(o => o.customer_name === value);
                if (match && match.customer_code) updated.customer_code = match.customer_code;
            }
            return updated;
        });
    };

    const handleEditModelChange = (field, value) => {
        setEditForm(prev => {
            const updated = { ...prev, [field]: value || '' };
            if (field === 'transformer_model' && value) {
                const match = orders.find(o => o.transformer_model === value && o.model_name);
                if (match) updated.model_name = match.model_name;
            } else if (field === 'model_name' && value) {
                const match = orders.find(o => o.model_name === value && o.transformer_model);
                if (match) updated.transformer_model = match.transformer_model;
            }
            return updated;
        });
    };

    const handleEditOrder = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/api/sales/orders/${editForm.original_order_id}`, {
                order_id: editForm.order_id,
                customer_code: editForm.customer_code,
                customer_name: editForm.customer_name,
                transformer_model: editForm.transformer_model,
                model_name: editForm.model_name,
                quantity: editForm.quantity,
                order_date: new Date(editForm.order_date).toISOString(),
                deadline_date: new Date(editForm.deadline_date).toISOString(),
                status: editForm.status
            });
            if (editForm.requirement_file) {
                const formData = new FormData();
                formData.append('file', editForm.requirement_file);
                await api.post(`/api/sales/orders/${editForm.order_id}/upload-requirement`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            setOpenEditModal(false);
            setEditForm(null);
            fetchData();
        } catch (err) {
            alert("Error updating order: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleMarkFinished = async (orderId) => {
        try {
            await api.put(`/api/sales/orders/${orderId}/status`, { status: 'finished' });
            fetchData();
        } catch (err) { alert("Error updating order status"); }
    };

    const handleDeleteOrder = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/api/sales/orders/${deleteTarget.order_id}`);
            setDeleteTarget(null);
            fetchData();
        } catch (err) { alert("Error deleting order: " + (err.response?.data?.detail || err.message)); }
    };

    // --- Sorting ---
    const [orderDirection, setOrderDirection] = useState('desc');
    const [valueToOrderBy, setValueToOrderBy] = useState('order_date');
    const handleRequestSort = (property) => {
        const isAscending = valueToOrderBy === property && orderDirection === 'asc';
        setOrderDirection(isAscending ? 'desc' : 'asc');
        setValueToOrderBy(property);
    };
    const sortedOrders = [...ordersWithStt].sort((a, b) => {
        if (a[valueToOrderBy] < b[valueToOrderBy]) return orderDirection === 'asc' ? -1 : 1;
        if (a[valueToOrderBy] > b[valueToOrderBy]) return orderDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const SortableHeader = ({ field, label }) => (
        <TableCell>
            <TableSortLabel active={valueToOrderBy === field} direction={valueToOrderBy === field ? orderDirection : 'asc'} onClick={() => handleRequestSort(field)}>
                {label}
            </TableSortLabel>
        </TableCell>
    );

    return (
        <Container maxWidth="xl" sx={{ mt: 2 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: 'primary.dark' }}>
                Đơn bán hàng (Orders)
            </Typography>

            <Paper sx={{ mt: 3, p: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <TextField size="small" placeholder="Search orders..." variant="outlined" InputProps={{ startAdornment: <Search size={20} style={{ marginRight: 8, color: 'gray' }} /> }} />
                    <Button variant="contained" startIcon={<PlusCircle size={18} />} onClick={() => { setOrderRows([emptyRow()]); setOpenCreateModal(true); }}>
                        New Order
                    </Button>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: 'grey.100' }}>
                            <TableRow>
                                <SortableHeader field="stt" label="STT" />
                                <SortableHeader field="order_id" label="Order ID" />
                                <SortableHeader field="customer_code" label="Mã KH" />
                                <SortableHeader field="customer_name" label="Tên KH" />
                                <SortableHeader field="transformer_model" label="Mã SP" />
                                <SortableHeader field="model_name" label="Tên SP" />
                                <SortableHeader field="quantity" label="Qty" />
                                <SortableHeader field="order_date" label="Date" />
                                <SortableHeader field="deadline_date" label="Deadline" />
                                <TableCell>Requirement</TableCell>
                                <SortableHeader field="status" label="Status" />
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedOrders.map(o => (
                                <TableRow key={o.id}>
                                    <TableCell>{o.stt}</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>{o.order_id}</TableCell>
                                    <TableCell>{o.customer_code || '—'}</TableCell>
                                    <TableCell>{o.customer_name}</TableCell>
                                    <TableCell>{o.transformer_model}</TableCell>
                                    <TableCell>{o.model_name || '—'}</TableCell>
                                    <TableCell>{o.quantity}</TableCell>
                                    <TableCell>{new Date(o.order_date).toLocaleDateString('en-GB')}</TableCell>
                                    <TableCell>{o.deadline_date ? new Date(o.deadline_date).toLocaleDateString('en-GB') : '—'}</TableCell>
                                    <TableCell>{o.requirement_file ? <Chip size="small" label={o.requirement_file.substring(0, 20)} color="info" variant="outlined" /> : '—'}</TableCell>
                                    <TableCell><Chip size="small" label={o.status.toUpperCase()} color={o.status === 'pending' ? 'warning' : o.status === 'completed' ? 'info' : o.status === 'finished' ? 'success' : 'default'} /></TableCell>
                                    <TableCell align="right" sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                        {o.status !== 'finished' && (
                                            <>
                                                <Tooltip title="Edit Order">
                                                    <IconButton size="small" onClick={() => openEditForOrder(o)}>
                                                        <Edit2 size={16} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete Order">
                                                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(o)}>
                                                        <Trash2 size={16} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    color={o.status === 'completed' ? 'success' : 'inherit'}
                                                    disabled={o.status !== 'completed'}
                                                    onClick={() => handleMarkFinished(o.order_id)}
                                                >
                                                    Mark Finished
                                                </Button>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {orders.length === 0 && <TableRow><TableCell colSpan={9} align="center">No orders found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* ===== CREATE ORDER MODAL (Horizontal Inline Layout) ===== */}
            <Modal open={openCreateModal} onClose={() => setOpenCreateModal(false)}>
                <Box sx={modalStyle}>
                    <Typography variant="h6" fontWeight={600} gutterBottom>Create Sales Order</Typography>
                    <form onSubmit={handleCreateOrders}>
                        {orderRows.map((row, idx) => (
                            <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5, flexWrap: 'wrap' }}>
                                <TextField size="small" required label="Order ID*" InputLabelProps={shrink} value={row.order_id} onChange={e => updateRow(idx, 'order_id', e.target.value)} sx={{ width: 120 }} />
                                <Autocomplete
                                    freeSolo
                                    options={customerCodeSuggestions}
                                    value={row.customer_code}
                                    onInputChange={(_, val) => handleCustomerChange(idx, 'customer_code', val)}
                                    renderInput={(params) => <TextField {...params} size="small" placeholder="Mã KH" label="Mã KH" InputLabelProps={shrink} />}
                                    sx={{ width: 140 }}
                                />
                                <Autocomplete
                                    freeSolo
                                    options={customerNameSuggestions}
                                    value={row.customer_name}
                                    onInputChange={(_, val) => handleCustomerChange(idx, 'customer_name', val)}
                                    renderInput={(params) => <TextField {...params} size="small" required label="Tên KH*" InputLabelProps={shrink} />}
                                    sx={{ width: 180 }}
                                />
                                <Autocomplete
                                    freeSolo
                                    options={modelCodeSuggestions}
                                    value={row.transformer_model}
                                    onInputChange={(_, val) => handleModelChange(idx, 'transformer_model', val)}
                                    renderInput={(params) => <TextField {...params} size="small" required label="Mã Sp*" InputLabelProps={shrink} />}
                                    sx={{ width: 140 }}
                                />
                                <Autocomplete
                                    freeSolo
                                    options={modelNameSuggestions}
                                    value={row.model_name}
                                    onInputChange={(_, val) => handleModelChange(idx, 'model_name', val)}
                                    renderInput={(params) => <TextField {...params} size="small" placeholder="Tên SP" label="Tên SP" InputLabelProps={shrink} />}
                                    sx={{ width: 180 }}
                                />
                                <TextField size="small" required type="number" label="Quantity*" InputLabelProps={shrink} value={row.quantity} onChange={e => updateRow(idx, 'quantity', parseInt(e.target.value) || 1)} sx={{ width: 90 }} />
                                <TextField size="small" required type="date" label="Order Date*" InputLabelProps={shrink} value={row.order_date} onChange={e => updateRow(idx, 'order_date', e.target.value)} sx={{ width: 140 }} />
                                <TextField size="small" required type="date" label="Deadline*" InputLabelProps={shrink} value={row.deadline_date} onChange={e => updateRow(idx, 'deadline_date', e.target.value)} sx={{ width: 140 }} />
                                <Button variant="outlined" component="label" size="small" startIcon={<Upload size={14} />} sx={{ textTransform: 'none', minWidth: 130, height: 40 }}>
                                    {row.requirement_file ? row.requirement_file.name.substring(0, 12) + '...' : 'Requirement'}
                                    <input type="file" hidden onChange={e => updateRow(idx, 'requirement_file', e.target.files[0])} />
                                </Button>
                                {orderRows.length > 1 && (
                                    <IconButton size="small" color="error" onClick={() => handleRemoveRow(idx)}>
                                        <X size={16} />
                                    </IconButton>
                                )}
                            </Box>
                        ))}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                            <Button variant="contained" color="success" size="small" onClick={handleAddRow} sx={{ minWidth: 40 }}>
                                +
                            </Button>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Button variant="outlined" onClick={() => setOpenCreateModal(false)}>Cancel</Button>
                                <Button variant="contained" type="submit">Save</Button>
                            </Box>
                        </Box>
                    </form>
                </Box>
            </Modal>

            {/* ===== EDIT ORDER MODAL ===== */}
            <Modal open={openEditModal} onClose={() => setOpenEditModal(false)}>
                <Box sx={{ ...modalStyle, maxWidth: 850 }}>
                    <Typography variant="h6" fontWeight={600} gutterBottom>Edit Order: {editForm?.original_order_id}</Typography>
                    {editForm && (
                        <form onSubmit={handleEditOrder}>
                            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
                                <TextField size="small" required label="Order ID*" InputLabelProps={shrink} value={editForm.order_id} onChange={e => setEditForm({ ...editForm, order_id: e.target.value })} sx={{ width: 120 }} />
                                <Autocomplete
                                    freeSolo
                                    options={customerCodeSuggestions}
                                    value={editForm.customer_code}
                                    onInputChange={(_, val) => handleEditCustomerChange('customer_code', val)}
                                    renderInput={(params) => <TextField {...params} size="small" placeholder="Mã KH" label="Mã KH" InputLabelProps={shrink} />}
                                    sx={{ width: 140 }}
                                />
                                <Autocomplete
                                    freeSolo
                                    options={customerNameSuggestions}
                                    value={editForm.customer_name}
                                    onInputChange={(_, val) => handleEditCustomerChange('customer_name', val)}
                                    renderInput={(params) => <TextField {...params} size="small" required label="Tên KH*" InputLabelProps={shrink} />}
                                    sx={{ width: 220 }}
                                />
                                <Autocomplete
                                    freeSolo
                                    options={modelCodeSuggestions}
                                    value={editForm.transformer_model}
                                    onInputChange={(_, val) => handleEditModelChange('transformer_model', val)}
                                    renderInput={(params) => <TextField {...params} size="small" required label="Mã SP*" InputLabelProps={shrink} />}
                                    sx={{ width: 150 }}
                                />
                                <Autocomplete
                                    freeSolo
                                    options={modelNameSuggestions}
                                    value={editForm.model_name}
                                    onInputChange={(_, val) => handleEditModelChange('model_name', val)}
                                    renderInput={(params) => <TextField {...params} size="small" placeholder="Tên SP" label="Tên SP" InputLabelProps={shrink} />}
                                    sx={{ width: 220 }}
                                />
                                <TextField size="small" required type="number" label="Quantity*" InputLabelProps={shrink} value={editForm.quantity} onChange={e => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 1 })} sx={{ width: 100 }} />
                                <TextField size="small" required type="date" label="Order Date*" InputLabelProps={shrink} value={editForm.order_date} onChange={e => setEditForm({ ...editForm, order_date: e.target.value })} sx={{ width: 150 }} />
                                <TextField size="small" required type="date" label="Deadline*" InputLabelProps={shrink} value={editForm.deadline_date} onChange={e => setEditForm({ ...editForm, deadline_date: e.target.value })} sx={{ width: 150 }} />
                                <Button variant="outlined" component="label" size="small" startIcon={<Upload size={14} />} sx={{ textTransform: 'none', height: 40 }}>
                                    {editForm.requirement_file ? editForm.requirement_file.name.substring(0, 15) : (editForm.existing_file || 'Upload File')}
                                    <input type="file" hidden onChange={e => setEditForm({ ...editForm, requirement_file: e.target.files[0] })} />
                                </Button>
                                <TextField size="small" select label="Status" InputLabelProps={shrink} value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} sx={{ width: 140 }} SelectProps={{ native: true }}>
                                    <option value="pending">Pending</option>
                                    <option value="in_production">In Production</option>
                                    <option value="completed">Completed</option>
                                    <option value="finished">Finished</option>
                                </TextField>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                <Button variant="outlined" onClick={() => setOpenEditModal(false)}>Cancel</Button>
                                <Button variant="contained" type="submit">Save Changes</Button>
                            </Box>
                        </form>
                    )}
                </Box>
            </Modal>

            {/* ===== DELETE ORDER CONFIRMATION ===== */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 600, color: 'error.main' }}>
                    ⚠️ Delete Order
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1">
                        Are you sure you want to delete order <strong>{deleteTarget?.order_id}</strong> ({deleteTarget?.customer_name})?
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDeleteOrder}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
