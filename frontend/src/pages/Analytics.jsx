import React, { useState, useEffect } from 'react';
import { Container, Typography, Grid, Paper, Box, CircularProgress } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, CheckCircle, Settings } from 'lucide-react';
import api from '../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const KpiCard = ({ title, value, icon, color }) => (
    <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 2, borderLeft: `6px solid ${color}` }}>
        <Box>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>
                {title}
            </Typography>
            <Typography variant="h4" fontWeight={700} color="text.primary">
                {value}
            </Typography>
        </Box>
        <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: `${color}15`, color: color }}>
            {icon}
        </Box>
    </Paper>
);

export default function Analytics() {
    const [kpis, setKpis] = useState(null);
    const [throughput, setThroughput] = useState([]);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const kpiRes = await api.get('/api/analytics/kpis');
                const thrRes = await api.get('/api/analytics/throughput');
                setKpis(kpiRes.data);
                setThroughput(thrRes.data);
            } catch (err) {
                console.error("Failed to load analytics", err);
            }
        };
        fetchAnalytics();
    }, []);

    if (!kpis) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
            <CircularProgress />
        </Box>
    );

    // Prepare pie chart data from equipment dictionary
    const pieData = Object.entries(kpis.equipment).map(([name, value]) => ({ name, value }));

    return (
        <Container maxWidth="xl" sx={{ mt: 2 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: 'primary.dark', mb: 4 }}>
                Dashboard, thống kê, báo cáo
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <KpiCard title="Total Customers" value={kpis.total_customers} icon={<Users size={28} />} color="#3b82f6" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <KpiCard title="Active Prod Jobs" value={kpis.active_jobs} icon={<Activity size={28} />} color="#f59e0b" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <KpiCard title="Completed Jobs" value={kpis.completed_jobs} icon={<CheckCircle size={28} />} color="#10b981" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <KpiCard title="Active Equipment" value={kpis.equipment['active'] || 0} icon={<Settings size={28} />} color="#6366f1" />
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 3, borderRadius: 2, height: 400 }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            Production Throughput (Monthly)
                        </Typography>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={throughput} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <RechartsTooltip />
                                <Legend />
                                <Bar dataKey="completed" name="Completed Units" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="target" name="Target Quota" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 3, borderRadius: 2, height: 400 }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            Equipment Status
                        </Typography>
                        <ResponsiveContainer width="100%" height="90%">
                            <PieChart>
                                <Pie
                                    data={pieData.length > 0 ? pieData : [{ name: 'No Data', value: 1 }]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
}
