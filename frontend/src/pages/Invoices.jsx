import { Container, Typography, Paper, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

export default function Invoices() {
    return (
        <Container maxWidth="xl" sx={{ mt: 2 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: 'primary.dark' }}>
                Quản lý Hoá đơn
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Theo dõi hoá đơn xuất cho khách hàng.
            </Typography>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: 'grey.100' }}>
                            <TableRow>
                                <TableCell>Mã HĐ</TableCell>
                                <TableCell>Khách hàng</TableCell>
                                <TableCell>Ngày xuất</TableCell>
                                <TableCell>Tổng tiền</TableCell>
                                <TableCell>Trạng thái</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow><TableCell colSpan={5} align="center">Chưa có hoá đơn nào.</TableCell></TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Container>
    );
}
