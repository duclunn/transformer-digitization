import React, { useState, useEffect } from 'react';
import {
    Container, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Box, Alert, CircularProgress
} from '@mui/material';
import api from '../services/api';

// Helper component to render a single QC document button
const QCButton = ({ label, docType, orderId, filePath, onUploadSuccess }) => {
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            await api.post(`/api/sales/orders/${orderId}/qc-docs/${docType}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onUploadSuccess(); // Refresh table
        } catch (error) {
            console.error(`Failed to upload ${label}:`, error);
            alert(`Thêm tài liệu ${label} thất bại`);
        } finally {
            setUploading(false);
        }

        // Reset file input
        event.target.value = null;
    };

    const handleDownload = async () => {
        try {
            const response = await api.get(`/api/sales/orders/${orderId}/qc-docs/${docType}`, {
                responseType: 'blob', // Important for downloading files
            });

            // Extract filename safely, defaulting to the label
            const contentDisposition = response.headers['content-disposition'];
            let fileName = filePath || `${label}.pdf`;

            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (fileNameMatch && fileNameMatch.length === 2) {
                    fileName = fileNameMatch[1];
                }
            }

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed", error);
            alert("Lỗi tải file");
        }
    };

    if (uploading) {
        return (
            <Button variant="outlined" disabled sx={{ minWidth: 100, borderRadius: 2 }}>
                <CircularProgress size={20} />
            </Button>
        );
    }

    if (filePath) {
        // Render Solid Blue Button if file exists
        return (
            <Button
                variant="contained"
                color="primary"
                onClick={handleDownload}
                sx={{
                    minWidth: 100,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 500,
                    boxShadow: 2
                }}
            >
                {/* Try to extract just the original filename omitting the hash if possible, or just show B1.pdf equivalent */}
                {label}.pdf
            </Button>
        );
    }

    // Render Dashed Outlined Button if no file
    return (
        <Button
            variant="outlined"
            component="label"
            sx={{
                minWidth: 100,
                borderRadius: 2,
                borderStyle: 'dashed',
                borderWidth: 1.5,
                borderColor: 'grey.500',
                color: 'text.primary',
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': {
                    borderStyle: 'dashed',
                    borderWidth: 1.5,
                }
            }}
        >
            {label}
            <input type="file" hidden accept=".pdf,.doc,.docx,.jpg,.png" onChange={handleFileUpload} />
        </Button>
    );
};

export default function QualityControl() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await api.get('/api/sales/orders');
            setOrders(response.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch sales orders');
            setLoading(false);
        }
    };

    if (loading) return <Container sx={{ mt: 4 }}><CircularProgress /></Container>;

    return (
        <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" fontWeight={700} color="primary.dark">
                    Quản lý chất lượng
                </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 3, overflow: 'hidden' }}>
                <Table size="medium">
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell rowSpan={2} sx={{ fontWeight: 700, fontSize: '1rem', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                                Mã đơn hàng
                            </TableCell>
                            <TableCell colSpan={4} align="center" sx={{ fontWeight: 700, fontSize: '1rem', borderBottom: '1px solid rgba(224, 224, 224, 1)', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                                Sản xuất
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: '1rem', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>
                                Xuất xưởng
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            {/* Sản xuất Columns */}
                            <TableCell align="center" sx={{ fontWeight: 600, borderRight: '1px dashed rgba(224, 224, 224, 1)' }}>B1</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600, borderRight: '1px dashed rgba(224, 224, 224, 1)' }}>B2</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600, borderRight: '1px dashed rgba(224, 224, 224, 1)' }}>KCS</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600, borderRight: '1px solid rgba(224, 224, 224, 1)' }}>Nghiệm thu<br />trước lắp ráp</TableCell>

                            {/* Xuất xưởng Columns */}
                            <TableCell align="center" sx={{ fontWeight: 600 }}>Kiểm tra xuất xưởng</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.order_id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                                    {order.order_id}
                                </TableCell>

                                <TableCell align="center" sx={{ borderRight: '1px dashed rgba(224, 224, 224, 1)' }}>
                                    <QCButton label="B1" docType="b1" orderId={order.order_id} filePath={order.qc_b1_file} onUploadSuccess={fetchOrders} />
                                </TableCell>

                                <TableCell align="center" sx={{ borderRight: '1px dashed rgba(224, 224, 224, 1)' }}>
                                    <QCButton label="B2" docType="b2" orderId={order.order_id} filePath={order.qc_b2_file} onUploadSuccess={fetchOrders} />
                                </TableCell>

                                <TableCell align="center" sx={{ borderRight: '1px dashed rgba(224, 224, 224, 1)' }}>
                                    <QCButton label="KCS" docType="kcs" orderId={order.order_id} filePath={order.qc_kcs_file} onUploadSuccess={fetchOrders} />
                                </TableCell>

                                <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                                    <QCButton label="Nghiệm thu" docType="nghiem_thu" orderId={order.order_id} filePath={order.qc_nghiem_thu_file} onUploadSuccess={fetchOrders} />
                                </TableCell>

                                <TableCell align="center">
                                    <QCButton label="Kiểm tra xuất xưởng" docType="xuat_xuong" orderId={order.order_id} filePath={order.qc_xuat_xuong_file} onUploadSuccess={fetchOrders} />
                                </TableCell>
                            </TableRow>
                        ))}
                        {orders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    Không có đơn hàng nào
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
}
