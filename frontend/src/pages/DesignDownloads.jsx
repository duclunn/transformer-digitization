import { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip, TableSortLabel, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Tooltip } from '@mui/material';
import { Download, FileText } from 'lucide-react';
import api from '../services/api';

const statusColor = {
    pending: 'warning',
    in_production: 'info',
    completed: 'success',
    finished: 'success'
};

export default function DesignDownloads() {
    const [orders, setOrders] = useState([]);
    const [downloadDialog, setDownloadDialog] = useState(null); // { order_id, files: [] }

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

    const handleDownload = async (orderId, filename) => {
        try {
            const response = await api.get(`/api/sales/orders/${orderId}/download-design/${encodeURIComponent(filename)}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert("Error downloading: " + (err.response?.data?.detail || "File not available"));
        }
    };

    const openDownloadDialog = async (orderId) => {
        try {
            const res = await api.get(`/api/sales/orders/${orderId}/design-files`);
            setDownloadDialog({ order_id: orderId, files: res.data.files });
        } catch (err) {
            alert("Error loading files");
        }
    };

    const handleDownloadAll = async (orderId, files) => {
        for (const f of files) {
            await handleDownload(orderId, f);
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
                📄 Bản vẽ thiết kế (Design Downloads)
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Tải xuống bản vẽ thiết kế cho từng đơn hàng để sử dụng trong sản xuất.
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
                                                />
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">Not uploaded yet</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {files.length > 0 ? (
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    startIcon={<Download size={14} />}
                                                    onClick={() => openDownloadDialog(order.order_id)}
                                                    sx={{ textTransform: 'none' }}
                                                >
                                                    Download ({files.length})
                                                </Button>
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">—</Typography>
                                            )}
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

            {/* Download Files Dialog */}
            <Dialog open={!!downloadDialog} onClose={() => setDownloadDialog(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>
                    📂 Design Files — {downloadDialog?.order_id}
                </DialogTitle>
                <DialogContent>
                    {downloadDialog?.files?.length > 0 ? (
                        <>
                            <List dense>
                                {downloadDialog.files.map((fname, idx) => (
                                    <ListItem key={idx} sx={{ bgcolor: idx % 2 === 0 ? 'grey.50' : 'white', borderRadius: 1 }}>
                                        <FileText size={16} style={{ marginRight: 8, color: '#666' }} />
                                        <ListItemText primary={fname} />
                                        <ListItemSecondaryAction>
                                            <Tooltip title="Download">
                                                <IconButton edge="end" size="small" color="primary" onClick={() => handleDownload(downloadDialog.order_id, fname)}>
                                                    <Download size={16} />
                                                </IconButton>
                                            </Tooltip>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                ))}
                            </List>
                        </>
                    ) : (
                        <Typography color="text.secondary">No files available.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    {downloadDialog?.files?.length > 1 && (
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<Download size={14} />}
                            onClick={() => handleDownloadAll(downloadDialog.order_id, downloadDialog.files)}
                        >
                            Download All
                        </Button>
                    )}
                    <Button onClick={() => setDownloadDialog(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
