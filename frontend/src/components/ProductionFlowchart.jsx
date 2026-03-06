import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Tooltip, IconButton, CircularProgress } from '@mui/material';
import { Check, Clock, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const FLOW_STEPS = [
    // Main track (Index 0-3)
    { id: 'cat_ton_at', label: 'Cắt tôn', col: 1, row: 1 },
    { id: 'ghep_ton_at', label: 'Ghép tôn', col: 2, row: 1 },
    { id: 'quet_epoxy_at', label: 'Quét epoxy', col: 3, row: 1 },
    { id: 'lap_sat_kep_at', label: 'Lắp sắt kẹp', col: 4, row: 1 },

    // Top Parallel Branch (Winding & Insulation)
    { id: 'lam_chi_tiet_cach_dien_at', label: 'Làm chi tiết cách điện', col: 1, row: 3 },
    { id: 'cuon_day_at', label: 'Cuộn dây', col: 2, row: 2 },

    // Merged Main Track (Index 6-11)
    { id: 'lap_rap_at', label: 'Lắp ráp', col: 5, row: 1 },
    { id: 'lam_dau_ra_at', label: 'Làm đầu ra HT, CT', col: 6, row: 1 },
    { id: 'say_ruot_may_at', label: 'Sấy ruột máy', col: 7, row: 1 },
    { id: 'lap_rap_may_at', label: 'Lắp ráp máy', col: 8, row: 1 },
    { id: 'hut_chan_khong_tra_dau_at', label: 'Hút CK, tra dầu', col: 9, row: 1 },
    { id: 'kiem_tra_kin_dau_at', label: 'Kiểm tra kín dầu, thử', col: 10, row: 1 },
];

const StepNode = ({ step, isCompleted, completedAt, isNext, onClick, loading, readOnly }) => {

    let bgcolor = '#f1f5f9';
    let color = '#64748b';
    let borderColor = '#cbd5e1';

    if (isCompleted) {
        bgcolor = '#dcfce7'; // green-100
        color = '#15803d'; // green-700
        borderColor = '#86efac'; // green-300
    } else if (isNext) {
        bgcolor = '#eff6ff'; // blue-100
        color = '#1d4ed8'; // blue-700
        borderColor = '#93c5fd'; // blue-300
    }

    return (
        <Paper
            elevation={isCompleted || isNext ? 3 : 0}
            onClick={onClick}
            sx={{
                gridColumn: step.col,
                gridRow: step.row,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
                height: isCompleted && completedAt ? 95 : 80,
                bgcolor,
                border: '2px solid',
                borderColor,
                borderRadius: 2,
                cursor: readOnly ? 'default' : 'pointer',
                transition: 'all 0.2s',
                '&:hover': readOnly ? {} : {
                    transform: 'translateY(-2px)',
                    boxShadow: 4
                },
                position: 'relative',
                zIndex: 2
            }}
        >
            <Typography variant="body2" fontWeight={600} align="center" sx={{ color }}>
                {step.label}
            </Typography>

            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {loading ? (
                    <CircularProgress size={16} />
                ) : isCompleted ? (
                    <>
                        <Check size={20} color={color} />
                        {completedAt && (
                            <Typography variant="caption" sx={{ color, mt: 0.5, fontSize: '0.65rem', lineHeight: 1.1 }}>
                                {new Date(completedAt.endsWith('Z') ? completedAt : completedAt + 'Z').toLocaleString('en-GB', {
                                    timeZone: 'Asia/Ho_Chi_Minh',
                                    hour: '2-digit', minute: '2-digit',
                                    day: '2-digit', month: '2-digit'
                                })}
                            </Typography>
                        )}
                    </>
                ) : isNext ? (
                    <AlertCircle size={20} color={color} />
                ) : (
                    <Clock size={20} color={color} />
                )}
            </Box>
        </Paper>
    );
};

export default function ProductionFlowchart({ job, readOnly = false }) {
    const [progress, setProgress] = useState(job.progress || {});
    const [loadingStep, setLoadingStep] = useState(null);
    const { activeRole } = useAuth();

    // Fetch latest on mount just in case
    useEffect(() => {
        const fetchProgress = async () => {
            // Depending on how list endpoint returns it, might need a fresh fetch. 
            // We rely on the initial passed prop for now.
        };
        fetchProgress();
    }, [job.id]);

    const handleStepClick = async (step) => {
        if (readOnly) return;
        // Simple toggle logic on click
        const currentlyCompleted = !!progress[step.id];
        setLoadingStep(step.id);

        try {
            const res = await api.put(`/api/production/jobs/${job.id}/progress`, {
                step_key: step.id,
                completed: !currentlyCompleted
            });
            setProgress(res.data);
        } catch (err) {
            console.error('Failed to update progress', err);
            alert('Failed to update progress. Please checking permissions or network.');
        } finally {
            setLoadingStep(null);
        }
    };

    // Calculate generic "Is Next" purely for UI highlighting
    // For branching: 
    // - lap_rap requires lap_sat_kep AND cuon_day AND lam_chi_tiet. (Simplified)
    const isNext = (stepId) => {
        if (progress[stepId]) return false;
        // Basic sequenced logic to highlight what needs doing next
        return true;
    };

    return (
        <Box sx={{ width: '100%', overflowX: 'auto', p: 4, bgcolor: '#f8fafc', borderRadius: 2 }}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(10, minmax(130px, 1fr))',
                    gridTemplateRows: 'repeat(3, 100px)',
                    gap: 3,
                    position: 'relative'
                }}
            >
                {/* Connecting Lines SVG Background Layer */}
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
                    {/* Horizontal Main Axis */}
                    <line x1="5%" y1="50px" x2="95%" y2="40px" stroke="#cbd5e1" strokeWidth="4" />

                    {/* Branch Down to Chi Tiet Cach Dien */}
                    <path d="M 65 50 L 65 250 L 195 250" fill="none" stroke="#cbd5e1" strokeWidth="4" />

                    {/* Branch Over from Chi Tiet to Cuon Day */}
                    <path d="M 195 250 L 325 250 L 325 150 M 195 250 L 195 150 L 325 150" fill="none" stroke="#cbd5e1" strokeWidth="4" />
                    <line x1="65" y1="250" x2="325" y2="150" stroke="#cbd5e1" strokeWidth="4" />

                    {/* All merge up to Lap Rap (Col 5) */}
                    <path d="M 325 150 L 585 150 L 585 50" fill="none" stroke="#cbd5e1" strokeWidth="4" />
                    <path d="M 250 250 L 585 250 L 585 50" fill="none" stroke="#cbd5e1" strokeWidth="4" />
                </svg>

                {FLOW_STEPS.map((step) => (
                    <StepNode
                        key={step.id}
                        step={step}
                        isCompleted={!!progress[step.id]}
                        completedAt={progress[step.id]}
                        isNext={isNext(step.id)}
                        loading={loadingStep === step.id}
                        readOnly={readOnly}
                        onClick={() => handleStepClick(step)}
                    />
                ))}
            </Box>
        </Box>
    );
}
