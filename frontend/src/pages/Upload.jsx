import { Box, Typography, Button } from '@mui/material';
import { Upload as UploadIcon } from 'lucide-react';

export default function Upload() {
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Department Data Upload
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Upload your department's Excel report here. The system will process and store the data.
            </Typography>

            <Box
                sx={{
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 6,
                    textAlign: 'center',
                    bgcolor: 'background.paper',
                    cursor: 'pointer',
                    '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover'
                    }
                }}
            >
                <UploadIcon size={48} color="#9e9e9e" />
                <Typography variant="h6" sx={{ mt: 2 }}>
                    Click or drag Excel file to this area to upload
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                    Support for a single or bulk upload. Strictly prohibit from uploading company data or other band files.
                </Typography>
                <Button variant="contained" component="span">
                    Select File
                </Button>
            </Box>
        </Box>
    );
}
