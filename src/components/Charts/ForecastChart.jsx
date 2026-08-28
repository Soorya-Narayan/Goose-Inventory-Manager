// src/components/Charts/ForecastChart.jsx
import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAppContext } from '../../context/AppContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// --- Helper: Get current time as a label ---
const getCurrentTimeLabel = () => new Date().toLocaleTimeString();

const ForecastChart = () => {
  // --- UPDATED: Get 'isDarkTheme' and 'aiPrediction' ---
  const { isDarkTheme, aiPrediction } = useAppContext();
  
  const [chartData, setChartData] = useState({
    labels: [getCurrentTimeLabel()],
    datasets: [
      {
        label: 'AI Prediction Value',
        data: [], // Start empty
        borderColor: '#8b5cf6', // Purple color
        borderWidth: 2.5,
        pointRadius: 2,
        pointBackgroundColor: '#8b5cf6',
        tension: 0.1,
        fill: false,
        borderDash: [5, 5], // Dashed line
      },
    ],
  });

  // --- UPDATED: This effect runs every time 'aiPrediction' changes ---
  useEffect(() => {
    // Check if the prediction exists and its value is a number
    if (aiPrediction && typeof aiPrediction.value === 'number') {
      
      setChartData(prevData => {
        const maxDataPoints = 20; // Keep last 20 data points
        const newValue = aiPrediction.value;

        const newLabels = [...prevData.labels, getCurrentTimeLabel()].slice(-maxDataPoints);
        const newData = [...prevData.datasets[0].data, newValue].slice(-maxDataPoints);

        return {
          labels: newLabels,
          datasets: [
            {
              ...prevData.datasets[0],
              data: newData,
            },
          ],
        };
      });
    }
  }, [aiPrediction]); // Dependency: re-run when aiPrediction changes

  // --- Chart Options ---
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        // --- UPDATED: Use 'isDarkTheme' ---
        ticks: { color: isDarkTheme ? '#94a3b8' : '#64748b' },
        grid: { color: isDarkTheme ? '#334155' : '#e2e8f0' },
      },
      y: {
        ticks: { color: isDarkTheme ? '#94a3b8' : '#64748b' },
        grid: { color: isDarkTheme ? '#334155' : '#e2e8f0' },
        title: {
           display: true,
           // --- UPDATED: Generic Title ---
           text: 'AI Predicted Value',
           color: isDarkTheme ? '#cbd5e1' : '#475569',
           font: { size: 12 }
        }
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: { color: isDarkTheme ? '#e2e8f0' : '#1e293b' },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
      datalabels: { display: false }
    },
  };

  return <Line options={options} data={chartData} />;
};

export default ForecastChart;