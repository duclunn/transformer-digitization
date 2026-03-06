import { useState, useEffect } from 'react';
import { Container, Typography, Paper, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip, Modal, TextField, Grid } from '@mui/material';
import { PlusCircle } from 'lucide-react';
import api from '../services/api';

const modalStyle = {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    width: 500, bgcolor: 'background.paper', boxShadow: 24, p: 4, borderRadius: 2
};

export default function MaterialRequests() {
    const [requests, setRequests] = useState([]);
    const [openModal, setOpenModal] = useState(false);
    const [form, setForm] = useState({ job_id: '', notes: '' });

    useEffect(() => {
        // Fetch from API when available
    }, []);

    return (
        <Container maxWidth="xl" sx={{ mt: 2 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: 'primary.dark' }}>
                Yêu cầu xuất Nguyên Vật Liệu
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Tạo và theo dõi yêu cầu xuất kho NVL cho các lệnh sản xuất.
            </Typography>

            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button variant="contained" startIcon={<PlusCircle size={18} />} onClick={() => setOpenModal(true)}>
                        Tạo yêu cầu xuất NVL
                    </Button>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: 'grey.100' }}>
                            <TableRow>
                                <TableCell>Mã YC</TableCell>
                                <TableCell>Mã LSX</TableCell>
                                <TableCell>Người yêu cầu</TableCell>
                                <TableCell>Ngày</TableCell>
                                <TableCell>Trạng thái</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {requests.length === 0 && <TableRow><TableCell colSpan={5} align="center">Chưa có yêu cầu nào.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Modal open={openModal} onClose={() => setOpenModal(false)}>
                <Box sx={modalStyle}>
                    <Typography variant="h6" gutterBottom fontWeight={600}>Tạo yêu cầu xuất NVL</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12}><TextField fullWidth required label="Mã lệnh sản xuất (Job ID)" value={form.job_id} onChange={e => setForm({ ...form, job_id: e.target.value })} /></Grid>
                        <Grid item xs={12}><TextField fullWidth multiline rows={3} label="Ghi chú" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Grid>
                        <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
                            <Button variant="contained">Submit</Button>
                        </Grid>
                    </Grid>
                </Box>
            </Modal>
        </Container>
    );
}
