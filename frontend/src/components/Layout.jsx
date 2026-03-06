import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, AppBar, Toolbar, Divider, Select, MenuItem, FormControl, Collapse } from '@mui/material';
import { LayoutDashboard, FileSpreadsheet, LogOut, User as UserIcon, Database, ShoppingCart, CalendarDays, Factory, Search, BarChart2, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const drawerWidth = 260;

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout, activeRole, setActiveRole } = useAuth();

    const [openMenus, setOpenMenus] = useState(() => {
        const saved = localStorage.getItem('sidebarOpenMenus');
        return saved ? JSON.parse(saved) : {};
    });

    // Determine if user has permission to upload data
    const canUpload = user && ['admin', 'sales', 'production', 'planning', 'technical'].includes(activeRole || user.role);

    const toggleMenu = (title) => {
        setOpenMenus(prev => {
            const newState = { ...prev, [title]: !prev[title] };
            localStorage.setItem('sidebarOpenMenus', JSON.stringify(newState));
            return newState;
        });
    };

    const mesModules = [
        {
            title: 'Dashboard & Thống kê',
            icon: <BarChart2 size={20} />,
            path: '/analytics'
        },
        {
            title: 'QL Thông tin sản xuất',
            icon: <Database size={20} />,
            children: [
                { text: 'Định mức NVL', path: '/bom' },
                { text: 'Công đoạn', path: '/stages' },
                { text: 'Quy trình', path: '/process-editor' },
                { text: 'Năng lực thiết bị', path: '/inventory' },
                { text: 'Thiết kế', path: '/design' }
            ]
        },
        {
            title: 'Quản lý bán hàng',
            icon: <ShoppingCart size={20} />,
            children: [
                { text: 'Khách hàng', path: '/customers' },
                { text: 'Đơn bán hàng', path: '/orders' },
                { text: 'Hoá đơn', path: '/invoices' }
            ]
        },
        {
            title: 'Quản lý sản xuất',
            icon: <CalendarDays size={20} />,
            path: '/planning',
        },
        {
            title: 'Sản xuất (MES)',
            icon: <Factory size={20} />,
            children: [
                { text: 'Yêu cầu xuất NVL', path: '/material-requests' },
                { text: 'Bản vẽ thiết kế', path: '/design-downloads' },
                { text: 'Khai báo tiến độ', path: '/' }
            ]
        },
        {
            title: 'Truy xuất nguồn gốc',
            icon: <Search size={20} />,
            path: '/traceability'
        },
        {
            title: 'Quản trị hệ thống',
            icon: <Shield size={20} />,
            children: [
                { text: 'Người dùng', path: '/users' },
                { text: 'Phân quyền', path: '/roles' }
            ]
        }
    ];

    // --- Role-Based Access Control (RBAC) ---
    const currentRole = activeRole || user?.role || 'user';
    const [allowedModules, setAllowedModules] = useState([]);

    useEffect(() => {
        const fetchPermissions = async () => {
            if (currentRole === 'admin') {
                // Admin sees all modules by default
                setAllowedModules(mesModules.map(m => m.title));
                return;
            }
            try {
                // Fetch dynamic permissions from backend
                const response = await api.get('/api/auth/permissions');
                const data = response.data;
                const rolePerm = data.find(p => p.role === currentRole);
                if (rolePerm) {
                    setAllowedModules(rolePerm.allowed_modules);
                } else {
                    setAllowedModules([]); // Fallback
                }
            } catch (error) {
                console.error("Failed to fetch permissions:", error);
                setAllowedModules([]);
            }
        };
        fetchPermissions();
    }, [currentRole]);

    let filteredModules = mesModules;

    if (currentRole !== 'admin') {
        filteredModules = mesModules.filter(module => allowedModules.includes(module.title));
    }

    if (canUpload) {
        filteredModules.push({
            title: 'Data Upload',
            icon: <FileSpreadsheet size={20} />,
            path: '/upload'
        });
    }

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'primary.dark' }}>
                <Toolbar>
                    <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600, flexGrow: 1 }}>
                        Transformer Operations Portal
                    </Typography>
                    {user && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <UserIcon size={20} style={{ marginRight: 8 }} />
                            <Typography variant="body2" sx={{ mr: user.role === 'admin' ? 0 : 2, fontWeight: 500 }}>
                                {user.username} ({user.department})
                            </Typography>
                            {user.role === 'admin' && (
                                <FormControl size="small" sx={{ minWidth: 140, ml: 2, bgcolor: 'primary.main', borderRadius: 1 }}>
                                    <Select
                                        value={activeRole || 'admin'}
                                        onChange={(e) => setActiveRole(e.target.value)}
                                        sx={{
                                            color: 'white',
                                            '.MuiOutlinedInput-notchedOutline': { border: 'none' },
                                            '.MuiSvgIcon-root': { color: 'white' },
                                            fontSize: '0.875rem',
                                            fontWeight: 500
                                        }}
                                    >
                                        <MenuItem value="admin">Admin View</MenuItem>
                                        <MenuItem value="sales">Sales View</MenuItem>
                                        <MenuItem value="production">Production View</MenuItem>
                                        <MenuItem value="planning">Planning View</MenuItem>
                                        <MenuItem value="technical">Technical View</MenuItem>
                                    </Select>
                                </FormControl>
                            )}
                        </Box>
                    )}
                </Toolbar>
            </AppBar>
            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
                }}
            >
                <Toolbar />
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ overflow: 'auto', mt: 2, flexGrow: 1 }}>
                        <List>
                            {filteredModules.map((module) => (
                                <Box key={module.title}>
                                    <ListItem disablePadding>
                                        <ListItemButton
                                            selected={!module.children && location.pathname === module.path}
                                            onClick={() => {
                                                if (module.children) {
                                                    toggleMenu(module.title);
                                                } else {
                                                    navigate(module.path);
                                                }
                                            }}
                                            sx={{
                                                mx: 1,
                                                borderRadius: 1,
                                                mb: 0.5,
                                                '&.Mui-selected': {
                                                    bgcolor: 'primary.light',
                                                    color: 'primary.main',
                                                    '& .MuiListItemIcon-root': { color: 'primary.main' }
                                                }
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 40 }}>
                                                {module.icon}
                                            </ListItemIcon>
                                            <ListItemText primary={module.title} primaryTypographyProps={{ fontWeight: 500, fontSize: '0.9rem' }} />
                                            {module.children && (
                                                openMenus[module.title] ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                                            )}
                                        </ListItemButton>
                                    </ListItem>

                                    {module.children && (
                                        <Collapse in={openMenus[module.title]} timeout="auto" unmountOnExit>
                                            <List component="div" disablePadding>
                                                {module.children.map((child) => (
                                                    <ListItemButton
                                                        key={child.text}
                                                        sx={{ pl: 4, mx: 1, mb: 0.5, borderRadius: 1 }}
                                                        onClick={() => navigate(child.path)}
                                                        selected={location.pathname === child.path}
                                                    >
                                                        <ListItemText primary={child.text} primaryTypographyProps={{ fontSize: '0.85rem' }} />
                                                    </ListItemButton>
                                                ))}
                                            </List>
                                        </Collapse>
                                    )}
                                </Box>
                            ))}
                        </List>
                    </Box>
                    <Divider />
                    <Box sx={{ p: 2, mb: 1 }}>
                        <ListItemButton onClick={handleLogout} sx={{ borderRadius: 1, color: 'error.main' }}>
                            <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}>
                                <LogOut />
                            </ListItemIcon>
                            <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 500 }} />
                        </ListItemButton>
                    </Box>
                </Box>
            </Drawer>
            <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
}
