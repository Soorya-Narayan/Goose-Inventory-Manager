import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const ChatRenderer = ({ action }) => {
    const navigate = useNavigate();

    if (!action || !action.tool) return null;

    // 1. RENDER_CHART
    if (action.tool === 'RENDER_CHART') {
        const { title, type, data, options } = action.args;

        // Default chart data if not fully provided (safety fallback)
        const chartData = data || {
            labels: [],
            datasets: []
        };

        const chartOptions = {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: 'var(--text-primary, #e2e8f0)' }
                },
                title: {
                    display: !!title,
                    text: title,
                    color: 'var(--text-primary, #e2e8f0)'
                },
            },
            scales: {
                x: {
                    ticks: { color: 'var(--text-secondary, #94a3b8)' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                y: {
                    ticks: { color: 'var(--text-secondary, #94a3b8)' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                }
            },
            ...options
        };

        return (
            <div style={{
                marginTop: '10px',
                marginBottom: '10px',
                padding: '10px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                {type === 'bar' ? (
                    <Bar data={chartData} options={chartOptions} />
                ) : (
                    <Line data={chartData} options={chartOptions} />
                )}
            </div>
        );
    }

    // 2. RENDER_TABLE
    if (action.tool === 'RENDER_TABLE') {
        const { title, columns, rows } = action.args;

        return (
            <div style={{ marginTop: '10px', overflowX: 'auto' }}>
                {title && <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{title}</div>}
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary, #e2e8f0)'
                }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
                            {columns.map((col, idx) => (
                                <th key={idx} style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rIdx) => (
                            <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                {columns.map((col, cIdx) => (
                                    <td key={cIdx} style={{ padding: '8px' }}>
                                        {row[col] || row[col.toLowerCase()] || '-'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    // 3. NAVIGATE - Page Navigation
    if (action.tool === 'NAVIGATE') {
        const { path } = action.args;

        // Trigger navigation using the hook
        React.useEffect(() => {
            if (path && navigate) {
                setTimeout(() => navigate(path), 300); // Small delay for smooth UX
            }
        }, [path, navigate]);

        return (
            <div style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: '10px',
                fontSize: '0.9rem',
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
            }}>
                <i className="fa-solid fa-route" style={{ fontSize: '1.2rem' }}></i>
                <span>Navigating to <strong>{path.replace('/', '').replace('-', ' ').toUpperCase()}</strong>...</span>
            </div>
        );
    }

    // 4. Fallback for unknown tools
    return (
        <div style={{
            padding: '8px',
            background: '#fef3c7',
            color: '#92400e',
            borderRadius: '4px',
            fontSize: '0.8rem',
            marginTop: '8px'
        }}>
            <i className="fa-solid fa-triangle-exclamation"></i> Unknown tool: {action.tool}
        </div>
    );
};

export default ChatRenderer;
