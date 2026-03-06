import { useState, useEffect } from 'react';
import { Container, Typography, Box, Tabs, Tab, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Modal, TextField, Grid, Chip } from '@mui/material';
import { PlusCircle, Search } from 'lucide-react';
import api from '../services/api';

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

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

export default function InventoryManagement() {
    const [tabValue, setTabValue] = useState(0);

    const [materials, setMaterials] = useState([]);
    const [equipment, setEquipment] = useState([]);

    const [openMaterialModal, setOpenMaterialModal] = useState(false);
    const [openEquipmentModal, setOpenEquipmentModal] = useState(false);

    const [materialForm, setMaterialForm] = useState({ material_code: '', name: '', description: '', unit: 'kg', stock_quantity: 0 });
    const [equipmentForm, setEquipmentForm] = useState({ equipment_code: '', name: '', stage: '', capacity_per_hour: 0 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const matRes = await api.get('/api/inventory/materials');
            const eqRes = await api.get('/api/inventory/equipment');
            setMaterials(matRes.data);
            setEquipment(eqRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateMaterial = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/inventory/materials', materialForm);
            setOpenMaterialModal(false);
            setMaterialForm({ material_code: '', name: '', description: '', unit: 'kg', stock_quantity: 0 });
            fetchData();
        } catch (err) {
            alert("Error creating material");
        }
    };

    const handleCreateEquipment = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/inventory/equipment', equipmentForm);
            setOpenEquipmentModal(false);
            setEquipmentForm({ equipment_code: '', name: '', stage: '', capacity_per_hour: 0 });
            fetchData();
        } catch (err) {
            alert("Error creating equipment");
        }
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 2 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: 'primary.dark' }}>
                Quản lý thông tin chung (Inventory & Equipment)
            </Typography>

            <Paper sx={{ mt: 3, borderRadius: 2 }}>
                <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
                    <Tab label="Nguyên vật liệu (Materials)" />
                    <Tab label="Năng lực thiết bị (Equipment)" />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <TextField size="small" placeholder="Search materials..." variant="outlined" InputProps={{ startAdornment: <Search size={20} style={{ marginRight: 8, color: 'gray' }} /> }} />
                        <Button variant="contained" startIcon={<PlusCircle size={18} />} onClick={() => setOpenMaterialModal(true)}>
                            New Material
                        </Button>
                    </Box>
                    <TableContainer>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: 'grey.100' }}>
                                <TableRow>
                                    <TableCell>Code</TableCell>
                                    <TableCell>Item Name</TableCell>
                                    <TableCell>Unit</TableCell>
                                    <TableCell>Stock Qty</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {materials.map(m => (
                                    <TableRow key={m.id}>
                                        <TableCell fontWeight={600}>{m.material_code}</TableCell>
                                        <TableCell>{m.name}</TableCell>
                                        <TableCell>{m.unit}</TableCell>
                                        <TableCell>
                                            <Chip size="small" label={`${m.stock_quantity}`} color={m.stock_quantity < 10 ? 'error' : 'success'} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {materials.length === 0 && <TableRow><TableCell colSpan={4} align="center">No materials found.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <TextField size="small" placeholder="Search equipment..." variant="outlined" InputProps={{ startAdornment: <Search size={20} style={{ marginRight: 8, color: 'gray' }} /> }} />
                        <Button variant="contained" startIcon={<PlusCircle size={18} />} onClick={() => setOpenEquipmentModal(true)}>
                            New Equipment
                        </Button>
                    </Box>
                    <TableContainer>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: 'grey.100' }}>
                                <TableRow>
                                    <TableCell>Eq Code</TableCell>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Assigned Stage</TableCell>
                                    <TableCell>Capacity / Hr</TableCell>
                                    <TableCell>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {equipment.map(e => (
                                    <TableRow key={e.id}>
                                        <TableCell fontWeight={600}>{e.equipment_code}</TableCell>
                                        <TableCell>{e.name}</TableCell>
                                        <TableCell>{e.stage}</TableCell>
                                        <TableCell>{e.capacity_per_hour}</TableCell>
                                        <TableCell><Chip size="small" label={e.status.toUpperCase()} color={e.status === 'active' ? 'success' : 'warning'} /></TableCell>
                                    </TableRow>
                                ))}
                                {equipment.length === 0 && <TableRow><TableCell colSpan={5} align="center">No equipment found.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </TabPanel>
            </Paper>

            <Modal open={openMaterialModal} onClose={() => setOpenMaterialModal(false)}>
                <Box sx={modalStyle}>
                    <Typography variant="h6" gutterBottom fontWeight={600}>Add Material Component</Typography>
                    <form onSubmit={handleCreateMaterial}>
                        <Grid container spacing={2}>
                            <Grid item xs={6}><TextField fullWidth required label="Material Code" value={materialForm.material_code} onChange={e => setMaterialForm({ ...materialForm, material_code: e.target.value })} /></Grid>
                            <Grid item xs={6}><TextField fullWidth required label="Material Name (e.g., Tôn silic)" value={materialForm.name} onChange={e => setMaterialForm({ ...materialForm, name: e.target.value })} /></Grid>
                            <Grid item xs={12}><TextField fullWidth label="Description" value={materialForm.description} onChange={e => setMaterialForm({ ...materialForm, description: e.target.value })} /></Grid>
                            <Grid item xs={6}><TextField fullWidth required label="Unit (e.g., kg, unit)" value={materialForm.unit} onChange={e => setMaterialForm({ ...materialForm, unit: e.target.value })} /></Grid>
                            <Grid item xs={6}><TextField fullWidth required type="number" label="Initial Stock Qty" value={materialForm.stock_quantity} onChange={e => setMaterialForm({ ...materialForm, stock_quantity: parseFloat(e.target.value) })} /></Grid>
                            <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                <Button onClick={() => setOpenMaterialModal(false)}>Cancel</Button>
                                <Button variant="contained" type="submit">Save</Button>
                            </Grid>
                        </Grid>
                    </form>
                </Box>
            </Modal>

            <Modal open={openEquipmentModal} onClose={() => setOpenEquipmentModal(false)}>
                <Box sx={modalStyle}>
                    <Typography variant="h6" gutterBottom fontWeight={600}>Register New Equipment</Typography>
                    <form onSubmit={handleCreateEquipment}>
                        <Grid container spacing={2}>
                            <Grid item xs={6}><TextField fullWidth required label="Equipment Code" value={equipmentForm.equipment_code} onChange={e => setEquipmentForm({ ...equipmentForm, equipment_code: e.target.value })} /></Grid>
                            <Grid item xs={6}><TextField fullWidth required label="Machine Name" value={equipmentForm.name} onChange={e => setEquipmentForm({ ...equipmentForm, name: e.target.value })} /></Grid>
                            <Grid item xs={6}><TextField fullWidth required label="Assigned Stage (e.g., Cắt tôn)" value={equipmentForm.stage} onChange={e => setEquipmentForm({ ...equipmentForm, stage: e.target.value })} /></Grid>
                            <Grid item xs={6}><TextField fullWidth required type="number" label="Capacity per hour" value={equipmentForm.capacity_per_hour} onChange={e => setEquipmentForm({ ...equipmentForm, capacity_per_hour: parseFloat(e.target.value) })} /></Grid>
                            <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                <Button onClick={() => setOpenEquipmentModal(false)}>Cancel</Button>
                                <Button variant="contained" type="submit">Save</Button>
                            </Grid>
                        </Grid>
                    </form>
                </Box>
            </Modal>
        </Container>
    );
}
