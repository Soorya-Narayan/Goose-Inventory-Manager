// src/components/Charts/ConsumptionComparisonChart.jsx
import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAppContext } from '../../context/AppContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Prop expected: period ('monthly', 'weekly')
const ConsumptionComparisonChart = ({ period }) => {
  // --- UPDATED: Get 'isDarkTheme' from context ---
  const { isDarkTheme, showToast } = useAppContext();
  
  const [chartData, setChartData] = useState({
    labels: ['Water', 'Chemicals', 'Energy'], // Categories
    datasets: [
      {
        label: 'Last Period',
        data: [], // Start empty
        backgroundColor: '#64748b',
        borderRadius: 4,
      },
      {
        label: 'This Period',
        data: [], // Start empty
        backgroundColor: '#3b82f6',
        borderRadius: 4,
      },
    ],
  });

  // --- UPDATED: This hook now fetches data ---
  useEffect(() => {
    // This async function is where you will fetch your analytics data
    const fetchAnalyticsData = async () => {
      console.log(`Fetching analytics data for period: ${period}`);
      try {
        // --- TODO: Implement your API call here ---
        // Example:
        // const response = await fetchAuth(`/api/analytics/consumption?period=${period}`);
        // const data = await response.json();
        //
        // const lastPeriodData = data.lastPeriod; // e.g., [1200, 80, 450]
        // const thisPeriodData = data.thisPeriod; // e.g., [1100, 75, 420]
        
        // --- For now, we set them to empty to remove the simulation ---
        const lastPeriodData = [];
        const thisPeriodData = [];
        
        setChartData({
          labels: ['Water', 'Chemicals', 'Energy'], // Categories
          datasets: [
            {
              ...chartData.datasets[0],
              data: lastPeriodData,
            },
            {
              ...chartData.datasets[1],
              data: thisPeriodData,
            },
          ],
        });

      } catch (error) {
        showToast('Could not load analytics data', 'error');
        console.error("Failed to fetch analytics data:", error);
      }
    };

    fetchAnalyticsData();
    
  // --- UPDATED: Fixed theme key dependency ---
  }, [period, isDarkTheme, showToast]); // Re-run when the period or theme changes

  // --- Chart Options ---
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { color: isDarkTheme ? '#94a3b8' : '#64748b' },
        grid: { display: false }, // Hide vertical grid lines for bar chart
      },
      y: {
        beginAtZero: true,
        ticks: { color: isDarkTheme ? '#94a3b8' : '#64748b' },
        grid: { color: isDarkTheme ? '#334155' : '#e2e8f0' },
        title: {
           display: true,
           text: 'Consumption Units (e.g., L, kg, kWh)', // Example axis title
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

  return <Bar options={options} data={chartData} />;
};

export default ConsumptionComparisonChart;