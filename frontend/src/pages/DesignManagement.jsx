import { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip, TableSortLabel, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material';
import { Upload, FileText, Search, Trash2, FolderUp } from 'lucide-react';
import api from '../services/api';

const statusColor = {
    pending: 'warning',
    in_production: 'info',
    completed: 'success',
    finished: 'success'
};

export default function DesignManagement() {
    const [orders, setOrders] = useState([]);
    const [uploading, setUploading] = useState(null);
    const [filesDialog, setFilesDialog] = useState(null); // { order_id, files: [] }

    // Sorting
    const [orderDirection, setOrderDirection] = useState('asc');
    const [valueToOrderBy, setValueToOrderBy] = useState('deadline_date');
    const handleRequestSort = (property) => {
        const isAsc = valueToOrderBy === property && orderDirection === 'asc';
        setOrderDirection(isAsc ? 'desc' : 'asc');
        setValueToOrderBy(property);
    };

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/api/sales/orders');
            setOrders(res.data);
        } catch (err) { console.error("Failed to fetch orders", err); }
    };

    const parseDesignFiles = (designFile) => {
        if (!designFile) return [];
        try {
            const parsed = JSON.parse(designFile);
            return Array.isArray(parsed) ? parsed : [designFile];
        } catch {
            return designFile ? [designFile] : [];
        }
    };

    const handleUploadFiles = async (orderId, fileList) => {
        if (!fileList || fileList.length === 0) return;
        setUploading(orderId);
        try {
            const formData = new FormData();
            for (let i = 0; i < fileList.length; i++) {
                formData.append('files', fileList[i]);
            }
            await api.post(`/api/sales/orders/${orderId}/upload-design`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchData();
        } catch (err) {
            alert("Error uploading: " + (err.response?.data?.detail || err.message));
        } finally {
            setUploading(null);
        }
    };

    const handleDeleteFile = async (orderId, filename) => {
        try {
            await api.delete(`/api/sales/orders/${orderId}/design-file/${encodeURIComponent(filename)}`);
            // Refresh files dialog
            const res = await api.get(`/api/sales/orders/${orderId}/design-files`);
            setFilesDialog({ order_id: orderId, files: res.data.files });
            fetchData();
        } catch (err) {
            alert("Error deleting file: " + (err.response?.data?.detail || err.message));
        }
    };

    const openFilesDialogFor = async (orderId) => {
        try {
            const res = await api.get(`/api/sales/orders/${orderId}/design-files`);
            setFilesDialog({ order_id: orderId, files: res.data.files });
        } catch (err) {
            alert("Error loading files");
        }
    };

    const sortedOrders = [...orders].sort((a, b) => {
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
                📐 Thiết kế (Design Management)
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Upload bản vẽ thiết kế cho từng đơn hàng. Hỗ trợ upload nhiều file hoặc cả thư mục.
            </Typography>

            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: 'grey.100' }}>
                            <TableRow>
                                <SortableHeader field="order_id" label="Order ID" />
                                <SortableHeader field="customer_name" label="Customer" />
                                <SortableHeader field="transformer_model" label="Model" />
                                <SortableHeader field="quantity" label="Qty" />
                                <SortableHeader field="deadline_date" label="Deadline" />
                                <SortableHeader field="status" label="Status" />
                                <TableCell>Design Files</TableCell>
                                <TableCell>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedOrders.map(order => {
                                const files = parseDesignFiles(order.design_file);
                                return (
                                    <TableRow key={order.id}>
                                        <TableCell sx={{ fontWeight: 600 }}>{order.order_id}</TableCell>
                                        <TableCell>{order.customer_name}</TableCell>
                                        <TableCell>{order.transformer_model}</TableCell>
                                        <TableCell>{order.quantity}</TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: 'error.main' }}>
                                            {order.deadline_date ? new Date(order.deadline_date).toLocaleDateString('en-GB') : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Chip size="small" label={order.status?.toUpperCase()} color={statusColor[order.status] || 'default'} />
                                        </TableCell>
                                        <TableCell>
                                            {files.length > 0 ? (
                                                <Chip
                                                    size="small"
                                                    icon={<FileText size={14} />}
                                                    label={`${files.length} file${files.length > 1 ? 's' : ''}`}
                                                    color="success"
                                                    variant="outlined"
                                                    onClick={() => openFilesDialogFor(order.order_id)}
                                                    sx={{ cursor: 'pointer' }}
                                                />
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">No files</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    component="label"
                                                    startIcon={<Upload size={14} />}
                                                    disabled={uploading === order.order_id}
                                                    sx={{ textTransform: 'none' }}
                                                >
                                                    {uploading === order.order_id ? '...' : 'Files'}
                                                    <input
                                                        type="file"
                                                        multiple
                                                        hidden
                                                        onChange={e => handleUploadFiles(order.order_id, e.target.files)}
                                                    />
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    component="label"
                                                    startIcon={<FolderUp size={14} />}
                                                    disabled={uploading === order.order_id}
                                                    sx={{ textTransform: 'none' }}
                                                >
                                                    {uploading === order.order_id ? '...' : 'Folder'}
                                                    <input
                                                        type="file"
                                                        hidden
                                                        onChange={e => handleUploadFiles(order.order_id, e.target.files)}
                                                        {...{ webkitdirectory: "", directory: "" }}
                                                    />
                                                </Button>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {orders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">No orders found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Files Management Dialog */}
            <Dialog open={!!filesDialog} onClose={() => setFilesDialog(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>
                    📂 Design Files — {filesDialog?.order_id}
                </DialogTitle>
                <DialogContent>
                    {filesDialog?.files?.length > 0 ? (
                        <List dense>
                            {filesDialog.files.map((fname, idx) => (
                                <ListItem key={idx} sx={{ bgcolor: idx % 2 === 0 ? 'grey.50' : 'white', borderRadius: 1 }}>
                                    <FileText size={16} style={{ marginRight: 8, color: '#666' }} />
                                    <ListItemText primary={fname} />
                                    <ListItemSecondaryAction>
                                        <Tooltip title="Delete File">
                                            <IconButton edge="end" size="small" color="error" onClick={() => handleDeleteFile(filesDialog.order_id, fname)}>
                                                <Trash2 size={16} />
                                            </IconButton>
                                        </Tooltip>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Typography color="text.secondary">No files uploaded yet.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFilesDialog(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
