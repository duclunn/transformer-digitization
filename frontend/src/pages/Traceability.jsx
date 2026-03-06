import { useState } from 'react';
import { Container, Typography, Paper, Box, TextField, Button, Grid, Divider } from '@mui/material';
import { Search, Link as LinkIcon, Cpu, UserCheck } from 'lucide-react';

export default function Traceability() {
    const [serial, setSerial] = useState('');
    const [searched, setSearched] = useState(false);

    const handleSearch = (e) => {
        e.preventDefault();
        if (serial) setSearched(true);
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 2 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: 'primary.dark' }}>
                Truy xuất nguồn gốc (Traceability)
            </Typography>

            <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }}>
                <form onSubmit={handleSearch}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <TextField
                            label="Product Serial Number / Job ID"
                            variant="outlined"
                            fullWidth
                            value={serial}
                            onChange={(e) => setSerial(e.target.value)}
                            InputProps={{
                                startAdornment: <Search size={20} style={{ marginRight: 8, color: 'gray' }} />
                            }}
                        />
                        <Button variant="contained" type="submit" sx={{ height: 56, px: 4 }}>
                            Trace Setup
                        </Button>
                    </Box>
                </form>
            </Paper>

            {searched && (
                <Paper sx={{ p: 4, mt: 4, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <LinkIcon size={24} style={{ marginRight: 12, color: '#3b82f6' }} />
                        <Typography variant="h6" fontWeight={600}>Traceability Report for: {serial}</Typography>
                    </Box>
                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Cpu size={20} color="#6366f1" /> Raw Materials Consumed
                            </Typography>
                            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="body2" sx={{ mb: 1 }}>• 120kg Tôn silic (Lot: TN-1209)</Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>• 45kg Dây đồng bọc giấy (Lot: CU-882)</Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>• 150L Dầu biến áp (Lot: OIL-X1)</Typography>
                            </Box>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <UserCheck size={20} color="#10b981" /> Process Sign-offs
                            </Typography>
                            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="body2" sx={{ mb: 1 }}>• Cắt tôn: Nguyen Van A (09:00 12/03)</Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>• Cuộn dây: Tran Thi B (14:30 13/03)</Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>• Lắp ráp: Le Van C (10:15 15/03)</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            )}
        </Container>
    );
}
