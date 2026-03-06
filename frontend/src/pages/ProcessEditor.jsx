import { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Typography, Paper, Box, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip } from '@mui/material';
import { PlusCircle, Save, Trash2, Link2 } from 'lucide-react';
import api from '../services/api';

const NODE_W = 160;
const NODE_H = 50;

export default function ProcessEditor() {
    const svgRef = useRef(null);
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [templateId, setTemplateId] = useState(null);
    const [templateName, setTemplateName] = useState('Default Process');

    // Interaction state
    const [dragging, setDragging] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [linking, setLinking] = useState(null); // source node id for edge creation
    const [openDialog, setOpenDialog] = useState(false);
    const [newNodeLabel, setNewNodeLabel] = useState('');
    const [saved, setSaved] = useState(true);

    useEffect(() => {
        loadTemplate();
    }, []);

    const loadTemplate = async () => {
        try {
            const res = await api.get('/api/process/templates');
            if (res.data.length > 0) {
                const t = res.data[0];
                setTemplateId(t.id);
                setTemplateName(t.name);
                setNodes(t.nodes || []);
                setEdges(t.edges || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSave = async () => {
        try {
            if (templateId) {
                await api.put(`/api/process/templates/${templateId}`, { nodes, edges });
            } else {
                const res = await api.post('/api/process/templates', { name: templateName, nodes, edges });
                setTemplateId(res.data.id);
            }
            setSaved(true);
        } catch (err) { alert('Error saving'); }
    };

    const addNode = () => {
        if (!newNodeLabel) return;
        const id = `node_${Date.now()}`;
        setNodes(prev => [...prev, { id, label: newNodeLabel, x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 }]);
        setNewNodeLabel('');
        setOpenDialog(false);
        setSaved(false);
    };

    const deleteNode = (nodeId) => {
        setNodes(prev => prev.filter(n => n.id !== nodeId));
        setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
        setSaved(false);
    };

    const handleMouseDown = (e, nodeId) => {
        if (linking) {
            // Complete edge
            if (linking !== nodeId && !edges.find(ed => ed.source === linking && ed.target === nodeId)) {
                setEdges(prev => [...prev, { source: linking, target: nodeId }]);
                setSaved(false);
            }
            setLinking(null);
            return;
        }
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const svgRect = svgRef.current.getBoundingClientRect();
        setDragOffset({ x: e.clientX - svgRect.left - node.x, y: e.clientY - svgRect.top - node.y });
        setDragging(nodeId);
    };

    const handleMouseMove = useCallback((e) => {
        if (!dragging) return;
        const svgRect = svgRef.current.getBoundingClientRect();
        const nx = e.clientX - svgRect.left - dragOffset.x;
        const ny = e.clientY - svgRect.top - dragOffset.y;
        setNodes(prev => prev.map(n => n.id === dragging ? { ...n, x: Math.max(0, nx), y: Math.max(0, ny) } : n));
        setSaved(false);
    }, [dragging, dragOffset]);

    const handleMouseUp = () => setDragging(null);

    const getNodeCenter = (nodeId) => {
        const n = nodes.find(nd => nd.id === nodeId);
        if (!n) return { x: 0, y: 0 };
        return { x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 };
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" fontWeight={700} sx={{ color: 'primary.dark' }}>
                    Quy trình sản xuất (Process Editor)
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Add new process step">
                        <Button variant="outlined" startIcon={<PlusCircle size={18} />} onClick={() => setOpenDialog(true)}>Add Step</Button>
                    </Tooltip>
                    <Tooltip title={linking ? 'Click a target node to connect' : 'Enable link mode then click two nodes'}>
                        <Button variant={linking ? 'contained' : 'outlined'} color={linking ? 'warning' : 'primary'} startIcon={<Link2 size={18} />} onClick={() => setLinking(linking ? null : '__WAITING__')}>
                            {linking ? 'Click target...' : 'Link Nodes'}
                        </Button>
                    </Tooltip>
                    <Button variant="contained" color="success" startIcon={<Save size={18} />} onClick={handleSave} disabled={saved}>
                        Save
                    </Button>
                </Box>
            </Box>

            <Paper sx={{ borderRadius: 2, overflow: 'hidden', border: '2px solid', borderColor: 'grey.200' }}>
                <svg
                    ref={svgRef}
                    width="100%"
                    height="600"
                    style={{ background: '#fafbfc', cursor: dragging ? 'grabbing' : linking ? 'crosshair' : 'default' }}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Grid pattern */}
                    <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Edges */}
                    {edges.map((edge, i) => {
                        const from = getNodeCenter(edge.source);
                        const to = getNodeCenter(edge.target);
                        const midX = (from.x + to.x) / 2;
                        const midY = (from.y + to.y) / 2;
                        return (
                            <g key={`edge-${i}`}>
                                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#64748b" strokeWidth="2" markerEnd="url(#arrowhead)" />
                                {/* delete edge button */}
                                <circle cx={midX} cy={midY} r="8" fill="#ef4444" opacity="0" cursor="pointer"
                                    onMouseEnter={e => e.target.setAttribute('opacity', '0.8')}
                                    onMouseLeave={e => e.target.setAttribute('opacity', '0')}
                                    onClick={() => { setEdges(prev => prev.filter((_, idx) => idx !== i)); setSaved(false); }}
                                />
                            </g>
                        );
                    })}

                    {/* Arrowhead marker */}
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                        </marker>
                    </defs>

                    {/* Nodes */}
                    {nodes.map(node => (
                        <g key={node.id}
                            onMouseDown={(e) => {
                                if (linking === '__WAITING__') {
                                    setLinking(node.id);
                                } else if (linking) {
                                    handleMouseDown(e, node.id);
                                } else {
                                    handleMouseDown(e, node.id);
                                }
                            }}
                            style={{ cursor: linking ? 'crosshair' : 'grab' }}
                        >
                            <rect x={node.x} y={node.y} width={NODE_W} height={NODE_H} rx="8" ry="8"
                                fill={linking === node.id ? '#fbbf24' : '#3b82f6'} stroke="#1e40af" strokeWidth="1.5"
                                filter="drop-shadow(2px 2px 4px rgba(0,0,0,0.15))"
                            />
                            <text x={node.x + NODE_W / 2} y={node.y + NODE_H / 2 + 5} textAnchor="middle" fill="white" fontSize="13" fontWeight="600" style={{ pointerEvents: 'none' }}>
                                {node.label}
                            </text>
                            {/* Delete icon */}
                            <g onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }} style={{ cursor: 'pointer' }}>
                                <circle cx={node.x + NODE_W - 5} cy={node.y + 5} r="9" fill="#ef4444" opacity="0.8" />
                                <text x={node.x + NODE_W - 5} y={node.y + 9} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" style={{ pointerEvents: 'none' }}>×</text>
                            </g>
                        </g>
                    ))}

                    {nodes.length === 0 && (
                        <text x="50%" y="50%" textAnchor="middle" fill="#94a3b8" fontSize="16">
                            Click "Add Step" to start building your process flow
                        </text>
                    )}
                </svg>
            </Paper>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Add Process Step</DialogTitle>
                <DialogContent>
                    <TextField autoFocus fullWidth label="Step Name (e.g., Cắt tôn)" value={newNodeLabel} onChange={e => setNewNodeLabel(e.target.value)} sx={{ mt: 1 }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={addNode}>Add</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
