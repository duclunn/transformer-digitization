import { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Typography, Paper, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip, Modal, TextField, Grid, TableSortLabel, IconButton, Tooltip } from '@mui/material';
import { CalendarPlus, ArrowRightCircle, ZoomIn, ZoomOut, X } from 'lucide-react';
import { Gantt, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";
import api from '../services/api';
import ProductionFlowchart from '../components/ProductionFlowchart';

const modalStyle = {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    width: 500, bgcolor: 'background.paper', boxShadow: 24, p: 4, borderRadius: 2
};

const statusColor = {
    pending: 'warning',
    in_production: 'info',
    delivered: 'success',
    not_started: 'default',
    completed: 'success'
};

export default function PlanningDashboard() {
    const [orders, setOrders] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [openModal, setOpenModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [jobForm, setJobForm] = useState({ job_id: '' });

    const [flowchartModalOpen, setFlowchartModalOpen] = useState(false);
    const [selectedFlowchartJob, setSelectedFlowchartJob] = useState(null);

    // Gantt zoom
    const [colWidth, setColWidth] = useState(65);
    const handleWheel = useCallback((e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setColWidth(w => {
                const delta = e.deltaY < 0 ? 5 : -5;
                return Math.max(30, Math.min(150, w + delta));
            });
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [ordersRes, jobsRes] = await Promise.all([
                api.get('/api/sales/orders'),
                api.get('/api/production/jobs')
            ]);
            setOrders(ordersRes.data);
            setJobs(jobsRes.data);
        } catch (err) { console.error(err); }
    };

    const handleCreateJob = async (e) => {
        e.preventDefault();
        if (!selectedOrder || !jobForm.job_id) return;
        try {
            await api.post('/api/production/jobs', {
                job_id: jobForm.job_id,
                sales_order_id: selectedOrder.order_id,
                transformer_model: selectedOrder.transformer_model,
                status: 'not_started'
            });
            // Update the order status to in_production
            await api.put(`/api/sales/orders/${selectedOrder.order_id}/status`, { status: 'in_production' });
            setOpenModal(false);
            setJobForm({ job_id: '' });
            setSelectedOrder(null);
            fetchData();
        } catch (err) {
            alert('Error creating production job: ' + (err.response?.data?.detail || err.message));
        }
    };

    const getLinkedJob = (orderId) => jobs.find(j => j.sales_order_id === orderId);
    const getLinkedOrder = (salesOrderId) => orders.find(o => o.order_id === salesOrderId);

    // Interactive sorting for sales orders table (default: deadline ascending)
    const [orderDirection, setOrderDirection] = useState('asc');
    const [valueToOrderBy, setValueToOrderBy] = useState('deadline_date');
    const handleRequestSort = (property) => {
        const isAsc = valueToOrderBy === property && orderDirection === 'asc';
        setOrderDirection(isAsc ? 'desc' : 'asc');
        setValueToOrderBy(property);
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

    const handleTaskChange = async (task) => {
        try {
            await api.put(`/api/production/jobs/${task.id}/dates`, {
                start_date: task.start.toISOString(),
                end_date: task.end.toISOString()
            });
            fetchData();
        } catch (err) {
            alert('Error updating dates');
            fetchData(); // Revert on failure
        }
    };

    const handleTaskClick = (task) => {
        const job = jobs.find(j => String(j.job_id) === task.id || String(j.id) === task.id);
        if (job) {
            setSelectedFlowchartJob(job);
            setFlowchartModalOpen(true);
        }
    };

    const ganttTasks = jobs.map(job => {
        const start = job.start_date ? new Date(job.start_date) : new Date();
        const end = job.end_date ? new Date(job.end_date) : new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
        return {
            start: start,
            end: end > start ? end : new Date(start.getTime() + 24 * 60 * 60 * 1000), // Ensure valid duration
            name: `${job.job_id} (${job.transformer_model})`,
            id: String(job.job_id || Math.random()),
            type: 'task',
            progress: job.status === 'completed' ? 100 : job.status === 'in_progress' ? 50 : 0,
            isDisabled: false,
            styles: { progressColor: job.status === 'completed' ? '#2e7d32' : '#0288d1', progressSelectedColor: '#1565c0' }
        };
    });

    return (
        <Container maxWidth="xl" sx={{ mt: 2 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: 'primary.dark' }}>
                Quản lý sản xuất (Production Planning)
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Xem đơn hàng từ Sales và tạo lệnh sản xuất (Production Job) tương ứng.
            </Typography>

            {/* Sales Orders requiring planning */}
            <Paper sx={{ p: 3, borderRadius: 2, mb: 4 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                    📋 Đơn hàng từ Sales  →  Lệnh sản xuất
                </Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: 'grey.100' }}>
                            <TableRow>
                                <SortableHeader field="order_id" label="Order ID" />
                                <SortableHeader field="customer_name" label="Customer" />
                                <SortableHeader field="transformer_model" label="Model" />
                                <SortableHeader field="quantity" label="Qty" />
                                <SortableHeader field="order_date" label="Order Date" />
                                <SortableHeader field="deadline_date" label="Deadline" />
                                <SortableHeader field="status" label="Status" />
                                <TableCell>Linked Job</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedOrders.map(order => {
                                const linkedJob = getLinkedJob(order.order_id);
                                return (
                                    <TableRow key={order.id}>
                                        <TableCell sx={{ fontWeight: 600 }}>{order.order_id}</TableCell>
                                        <TableCell>{order.customer_name}</TableCell>
                                        <TableCell>{order.transformer_model}</TableCell>
                                        <TableCell>{order.quantity}</TableCell>
                                        <TableCell>{new Date(order.order_date).toLocaleDateString('en-GB')}</TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: 'error.main' }}>{order.deadline_date ? new Date(order.deadline_date).toLocaleDateString('en-GB') : '—'}</TableCell>
                                        <TableCell><Chip size="small" label={order.status?.toUpperCase()} color={statusColor[order.status] || 'default'} /></TableCell>
                                        <TableCell>
                                            {linkedJob
                                                ? <Chip size="small" label={linkedJob.job_id} color="info" variant="outlined" />
                                                : <Typography variant="caption" color="text.secondary">—</Typography>
                                            }
                                        </TableCell>
                                        <TableCell>
                                            {!linkedJob && order.status === 'pending' && (
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    startIcon={<ArrowRightCircle size={16} />}
                                                    onClick={() => {
                                                        setSelectedOrder(order);
                                                        setJobForm({ job_id: `JOB-${order.order_id}` });
                                                        setOpenModal(true);
                                                    }}
                                                >
                                                    Create Job
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {orders.length === 0 && (
                                <TableRow><TableCell colSpan={9} align="center">No sales orders yet. Orders created by Sales will appear here automatically.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Active Production Jobs */}
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                    🏭 Lệnh sản xuất đang hoạt động
                </Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: 'grey.100' }}>
                            <TableRow>
                                <TableCell>Job ID</TableCell>
                                <TableCell>Transformer Model</TableCell>
                                <TableCell>Sales Order</TableCell>
                                <TableCell>Deadline</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {jobs.map(job => (
                                <TableRow key={job.id || job.job_id}>
                                    <TableCell sx={{ fontWeight: 600 }}>{job.job_id}</TableCell>
                                    <TableCell>{job.transformer_model}</TableCell>
                                    <TableCell>{job.sales_order_id || '—'}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: 'error.main' }}>{(() => { const lo = getLinkedOrder(job.sales_order_id); return lo?.deadline_date ? new Date(lo.deadline_date).toLocaleDateString('en-GB') : '—'; })()}</TableCell>
                                    <TableCell><Chip size="small" label={job.status?.toUpperCase()} color={statusColor[job.status] || 'default'} /></TableCell>
                                </TableRow>
                            ))}
                            {jobs.length === 0 && (
                                <TableRow><TableCell colSpan={5} align="center">No production jobs yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Gantt Chart UI */}
            {ganttTasks.length > 0 && (
                <Paper sx={{ p: 3, borderRadius: 2, mt: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" fontWeight={600}>
                            📊 Biểu đồ Gantt (Production Schedule)
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Tooltip title="Zoom Out">
                                <IconButton size="small" onClick={() => setColWidth(w => Math.max(30, w - 10))}>
                                    <ZoomOut size={18} />
                                </IconButton>
                            </Tooltip>
                            <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center' }}>{colWidth}px</Typography>
                            <Tooltip title="Zoom In">
                                <IconButton size="small" onClick={() => setColWidth(w => Math.min(150, w + 10))}>
                                    <ZoomIn size={18} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                    <Box
                        sx={{ overflowX: 'auto', mt: 1 }}
                        onWheel={handleWheel}
                    >
                        <Gantt tasks={ganttTasks} viewMode={ViewMode.Day} listCellWidth="" columnWidth={colWidth} onDateChange={handleTaskChange} onClick={handleTaskClick} rowHeight={45} barCornerRadius={4} />
                    </Box>
                </Paper>
            )}

            {/* Create Job Modal */}
            <Modal open={openModal} onClose={() => setOpenModal(false)}>
                <Box sx={modalStyle}>
                    <Typography variant="h6" gutterBottom fontWeight={600}>
                        <CalendarPlus size={20} style={{ marginRight: 8 }} />
                        Create Production Job from Order
                    </Typography>
                    {selectedOrder && (
                        <Box sx={{ p: 2, mb: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2"><strong>Order:</strong> {selectedOrder.order_id}</Typography>
                            <Typography variant="body2"><strong>Customer:</strong> {selectedOrder.customer_name}</Typography>
                            <Typography variant="body2"><strong>Model:</strong> {selectedOrder.transformer_model}</Typography>
                        </Box>
                    )}
                    <form onSubmit={handleCreateJob}>
                        <TextField fullWidth required label="Job ID" value={jobForm.job_id} onChange={e => setJobForm({ job_id: e.target.value })} sx={{ mb: 2 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
                            <Button variant="contained" type="submit">Create Job</Button>
                        </Box>
                    </form>
                </Box>
            </Modal>

            {/* Production Progress Modal for Gantt Chart Click */}
            <Modal open={flowchartModalOpen} onClose={() => { setFlowchartModalOpen(false); setSelectedFlowchartJob(null); }}>
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '90vw',
                    maxWidth: 1400,
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 4,
                    borderRadius: 3,
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h5" fontWeight={700}>
                            Thống kê Tiến độ (Read-Only): {selectedFlowchartJob?.job_id}
                        </Typography>
                        <IconButton onClick={() => { setFlowchartModalOpen(false); setSelectedFlowchartJob(null); }}>
                            <X />
                        </IconButton>
                    </Box>

                    {selectedFlowchartJob && (
                        <ProductionFlowchart job={selectedFlowchartJob} readOnly={true} />
                    )}
                </Box>
            </Modal>
        </Container>
    );
}
