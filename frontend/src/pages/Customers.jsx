import { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Modal, TextField, Grid, TableSortLabel, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { PlusCircle, Search, Trash2, Edit2 } from 'lucide-react';
import api from '../services/api';

const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 600,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    borderRadius: 2
};

export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [openCustomerModal, setOpenCustomerModal] = useState(false);
    const [customerForm, setCustomerForm] = useState({ customer_code: '', name: '', contact_person: '', phone: '', address: '' });

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteCode, setDeleteCode] = useState('');
    const [deleteError, setDeleteError] = useState('');

    // Edit state
    const [openEditModal, setOpenEditModal] = useState(false);
    const [editForm, setEditForm] = useState(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const custRes = await api.get('/api/sales/customers');
            setCustomers(custRes.data);
        } catch (err) { console.error("Failed to fetch customers", err); }
    };

    const handleCreateCustomer = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/sales/customers', customerForm);
            setOpenCustomerModal(false);
            setCustomerForm({ customer_code: '', name: '', contact_person: '', phone: '', address: '' });
            fetchData();
        } catch (err) { alert("Error creating customer: " + (err.response?.data?.detail || err.message)); }
    };

    const handleDeleteCustomer = async () => {
        if (!deleteTarget) return;
        if (deleteCode !== deleteTarget.customer_code) {
            setDeleteError('Customer code does not match!');
            return;
        }
        try {
            await api.delete(`/api/sales/customers/${deleteTarget.id}`, {
                data: { customer_code: deleteCode }
            });
            setDeleteTarget(null);
            setDeleteCode('');
            setDeleteError('');
            fetchData();
        } catch (err) { setDeleteError(err.response?.data?.detail || 'Error deleting customer'); }
    };

    // Edit
    const openEditForCustomer = (c) => {
        setEditForm({
            id: c.id,
            customer_code: c.customer_code || '',
            name: c.name || '',
            contact_person: c.contact_person || '',
            email: c.email || '',
            phone: c.phone || '',
            address: c.address || ''
        });
        setOpenEditModal(true);
    };

    const handleEditCustomer = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/api/sales/customers/${editForm.id}`, {
                customer_code: editForm.customer_code,
                name: editForm.name,
                contact_person: editForm.contact_person,
                email: editForm.email,
                phone: editForm.phone,
                address: editForm.address
            });
            setOpenEditModal(false);
            setEditForm(null);
            fetchData();
        } catch (err) { alert("Error updating customer: " + (err.response?.data?.detail || err.message)); }
    };

    // Sorting
    const [orderDirection, setOrderDirection] = useState('desc');
    const [valueToOrderBy, setValueToOrderBy] = useState('created_at');
    const handleRequestSort = (property) => {
        const isAscending = valueToOrderBy === property && orderDirection === 'asc';
        setOrderDirection(isAscending ? 'desc' : 'asc');
        setValueToOrderBy(property);
    };
    const sortedCustomers = [...customers].sort((a, b) => {
        const aVal = a[valueToOrderBy] ?? '';
        const bVal = b[valueToOrderBy] ?? '';
        if (aVal < bVal) return orderDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return orderDirection === 'asc' ? 1 : -1;
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
                Khách hàng (Customers)
            </Typography>

            <Paper sx={{ mt: 3, p: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <TextField size="small" placeholder="Search customers..." variant="outlined" InputProps={{ startAdornment: <Search size={20} style={{ marginRight: 8, color: 'gray' }} /> }} />
                    <Button variant="contained" startIcon={<PlusCircle size={18} />} onClick={() => setOpenCustomerModal(true)}>
                        New Customer
                    </Button>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: 'grey.100' }}>
                            <TableRow>
                                <SortableHeader field="customer_code" label="Code" />
                                <SortableHeader field="name" label="Company Name" />
                                <SortableHeader field="contact_person" label="Contact Person" />
                                <SortableHeader field="phone" label="Phone" />
                                <TableCell>Orders</TableCell>
                                <SortableHeader field="created_at" label="Created Date" />
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedCustomers.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell sx={{ fontWeight: 600 }}>{c.customer_code}</TableCell>
                                    <TableCell>{c.name}</TableCell>
                                    <TableCell>{c.contact_person || '—'}</TableCell>
                                    <TableCell>{c.phone || '—'}</TableCell>
                                    <TableCell>
                                        {c.orders && c.orders.length > 0
                                            ? c.orders.map(oid => (
                                                <Chip key={oid} label={oid} size="small" color="primary" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                                            ))
                                            : <Typography variant="caption" color="text.secondary">—</Typography>
                                        }
                                    </TableCell>
                                    <TableCell>{new Date(c.created_at).toLocaleDateString('en-GB')}</TableCell>
                                    <TableCell align="right" sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                        <Tooltip title="Edit Customer">
                                            <IconButton size="small" onClick={() => openEditForCustomer(c)}>
                                                <Edit2 size={16} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete Customer">
                                            <IconButton size="small" color="error" onClick={() => { setDeleteTarget(c); setDeleteCode(''); setDeleteError(''); }}>
                                                <Trash2 size={16} />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {customers.length === 0 && <TableRow><TableCell colSpan={7} align="center">No customers found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Create Customer Modal */}
            <Modal open={openCustomerModal} onClose={() => setOpenCustomerModal(false)}>
                <Box sx={modalStyle}>
                    <Typography variant="h6" gutterBottom fontWeight={600}>Add New Customer</Typography>
                    <form onSubmit={handleCreateCustomer}>
                        <Grid container spacing={2}>
                            <Grid item xs={6}><TextField fullWidth required label="Customer Code" value={customerForm.customer_code} onChange={e => setCustomerForm({ ...customerForm, customer_code: e.target.value })} /></Grid>
                            <Grid item xs={6}><TextField fullWidth required label="Company Name" value={customerForm.name} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} /></Grid>
                            <Grid item xs={6}><TextField fullWidth label="Contact Person" value={customerForm.contact_person} onChange={e => setCustomerForm({ ...customerForm, contact_person: e.target.value })} /></Grid>
                            <Grid item xs={6}><TextField fullWidth label="Phone" value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })} /></Grid>
                            <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Address" value={customerForm.address} onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })} /></Grid>
                            <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                <Button onClick={() => setOpenCustomerModal(false)}>Cancel</Button>
                                <Button variant="contained" type="submit">Save</Button>
                            </Grid>
                        </Grid>
                    </form>
                </Box>
            </Modal>

            {/* Edit Customer Modal */}
            <Modal open={openEditModal} onClose={() => setOpenEditModal(false)}>
                <Box sx={modalStyle}>
                    <Typography variant="h6" gutterBottom fontWeight={600}>Edit Customer</Typography>
                    {editForm && (
                        <form onSubmit={handleEditCustomer}>
                            <Grid container spacing={2}>
                                <Grid item xs={6}><TextField fullWidth required label="Customer Code" value={editForm.customer_code} onChange={e => setEditForm({ ...editForm, customer_code: e.target.value })} /></Grid>
                                <Grid item xs={6}><TextField fullWidth required label="Company Name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></Grid>
                                <Grid item xs={6}><TextField fullWidth label="Contact Person" value={editForm.contact_person} onChange={e => setEditForm({ ...editForm, contact_person: e.target.value })} /></Grid>
                                <Grid item xs={6}><TextField fullWidth label="Email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></Grid>
                                <Grid item xs={6}><TextField fullWidth label="Phone" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></Grid>
                                <Grid item xs={6}><TextField fullWidth multiline label="Address" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} /></Grid>
                                <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                    <Button onClick={() => setOpenEditModal(false)}>Cancel</Button>
                                    <Button variant="contained" type="submit">Save Changes</Button>
                                </Grid>
                            </Grid>
                        </form>
                    )}
                </Box>
            </Modal>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 600, color: 'error.main' }}>
                    ⚠️ Delete Customer
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        You are about to delete customer <strong>{deleteTarget?.name}</strong>.
                        This action cannot be undone.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Please type the customer code <strong>{deleteTarget?.customer_code}</strong> to confirm:
                    </Typography>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder={deleteTarget?.customer_code}
                        value={deleteCode}
                        onChange={e => { setDeleteCode(e.target.value); setDeleteError(''); }}
                        error={!!deleteError}
                        helperText={deleteError}
                        autoFocus
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDeleteCustomer}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
