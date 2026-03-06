import { useState, useEffect } from 'react';
import { Box, Typography, Container, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Modal, IconButton, Chip, TextField, Grid, MenuItem } from '@mui/material';
import { PlayCircle, CheckCircle, PackageSearch, X, UserPlus } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

import ProductionFlowchart from '../components/ProductionFlowchart';

const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 500,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    borderRadius: 3
};

export default function Dashboard() {
    const { user, activeRole } = useAuth();
    const isAdmin = user && (activeRole === 'admin' || user.role === 'admin');

    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    const fetchJobs = async () => {
        try {
            const res = await api.get('/api/production/jobs');
            setJobs(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const handleOpenJob = (job) => {
        setSelectedJob(job);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedJob(null);
        fetchJobs(); // refresh in case progress changed
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" fontWeight={700} sx={{ color: 'primary.dark' }}>
                    Senior Management Dashboard
                </Typography>
            </Box>

            <Paper sx={{ mt: 4, p: 3, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                    Active Production Jobs
                </Typography>

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Job ID</TableCell>
                                <TableCell>Model</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {jobs.map((job) => (
                                <TableRow key={job.id} hover>
                                    <TableCell fontWeight={500}>{job.job_id}</TableCell>
                                    <TableCell>{job.transformer_model || 'Unknown Model'}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={job.status.replace('_', ' ').toUpperCase()}
                                            color={job.status === 'completed' ? 'success' : job.status === 'in_progress' ? 'info' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<PackageSearch size={16} />}
                                            onClick={() => handleOpenJob(job)}
                                            disableElevation
                                        >
                                            View Progress
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {jobs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                        No active production jobs found. Upload data to begin.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Production Progress Modal */}
            <Modal open={modalOpen} onClose={handleCloseModal}>
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
                            Production Tracking: {selectedJob?.job_id}
                        </Typography>
                        <IconButton onClick={handleCloseModal}>
                            <X />
                        </IconButton>
                    </Box>

                    {selectedJob && (
                        <ProductionFlowchart job={selectedJob} />
                    )}
                </Box>
            </Modal>

        </Container>
    );
}
