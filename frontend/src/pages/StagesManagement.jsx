import { Container, Typography, Paper, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';

const STAGES = [
    { name: 'Cắt tôn', description: 'Cắt lõi tôn silic theo kích thước thiết kế', type: 'sequential' },
    { name: 'Ghép tôn', description: 'Ghép các lá tôn thành lõi biến áp', type: 'sequential' },
    { name: 'Quét Epoxy', description: 'Phủ lớp epoxy cách điện lên lõi tôn', type: 'sequential' },
    { name: 'Lắp sắt kẹp', description: 'Lắp ráp khung sắt kẹp cố định lõi', type: 'sequential' },
    { name: 'Làm chi tiết cách điện', description: 'Gia công các bộ phận cách điện', type: 'parallel' },
    { name: 'Cuộn dây', description: 'Cuộn dây đồng quanh lõi theo thiết kế', type: 'parallel' },
    { name: 'Lắp ráp', description: 'Lắp ráp ruột máy biến áp', type: 'sequential' },
    { name: 'Làm đầu ra', description: 'Gia công và đấu nối đầu ra', type: 'sequential' },
    { name: 'Sấy ruột máy', description: 'Sấy khô ruột máy trong lò nhiệt', type: 'sequential' },
    { name: 'Lắp ráp máy', description: 'Lắp ruột máy vào vỏ thùng', type: 'sequential' },
    { name: 'Hút chân không & trà dầu', description: 'Hút chân không rồi nạp dầu biến áp', type: 'sequential' },
    { name: 'Kiểm tra kín dầu', description: 'Kiểm tra kín, thử nghiệm điện', type: 'sequential' },
];

export default function StagesManagement() {
    return (
        <Container maxWidth="xl" sx={{ mt: 2 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: 'primary.dark' }}>
                Quản lý Công đoạn sản xuất
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Danh sách các công đoạn sản xuất máy biến áp. Sử dụng trang "Quy trình" để thiết lập thứ tự và kết nối giữa các công đoạn.
            </Typography>

            <Paper sx={{ borderRadius: 2 }}>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.100' }}>
                            <TableRow>
                                <TableCell>STT</TableCell>
                                <TableCell>Tên công đoạn</TableCell>
                                <TableCell>Mô tả</TableCell>
                                <TableCell>Loại</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {STAGES.map((s, i) => (
                                <TableRow key={s.name}>
                                    <TableCell>{i + 1}</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                                    <TableCell>{s.description}</TableCell>
                                    <TableCell>
                                        <Chip size="small" label={s.type === 'parallel' ? 'Song song' : 'Tuần tự'} color={s.type === 'parallel' ? 'info' : 'default'} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Container>
    );
}
