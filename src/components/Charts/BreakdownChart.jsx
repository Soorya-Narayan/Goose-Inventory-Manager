// src/components/Charts/BreakdownChart.jsx
import React, { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAppContext } from '../../context/AppContext';
// --- REMOVED ---
// import { CYCLE_STEPS } from '../../context/mockData'; // Get step names

ChartJS.register(ArcElement, Tooltip, Legend);

// Props expected: breakdownType ('water', 'energy'), period ('monthly', 'weekly')
const BreakdownChart = ({ breakdownType, period }) => {
  // --- UPDATED: Get 'isDarkTheme' and 'cycleSteps' from context ---
  const { isDarkTheme, cycleSteps } = useAppContext();
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });

  useEffect(() => {
    // --- Data Fetching/Simulation ---
    // This part is still simulated. You will need to replace
    // 'dataValues' with a real API fetch for your analytics data.
    let dataValues;
    if (breakdownType === 'water') {
      // Simulate water usage per step, slightly varying by period
      dataValues = period === 'monthly'
        ? [1500, 2000, 1500, 1800, 1200]
        : [350, 480, 350, 420, 280];
    } else { // energy
      // Simulate energy usage per step
      dataValues = period === 'monthly'
        ? [200, 450, 200, 400, 150]
        : [45, 100, 45, 90, 35];
    }

    setChartData({
      // --- UPDATED: Use 'cycleSteps' from context with fallback ---
      labels: (cycleSteps && cycleSteps.length > 0)
        ? cycleSteps.map(s => s.name)
        : ['Pre-Rinse', 'Caustic Wash', 'Post-Rinse', 'Acid Wash', 'Final Rinse'],
      datasets: [
        {
          label: breakdownType === 'water' ? 'Water Usage (L)' : 'Energy Usage (kWh)',
          data: dataValues,
          backgroundColor: [
            '#3b82f6', // Pre-Rinse
            '#ef4444', // Caustic Wash
            '#60a5fa', // Rinse
            '#f97316', // Hot Water Wash
            '#93c5fd', // Final Rinse
          ],
          // --- UPDATED: Use 'isDarkTheme' ---
          borderColor: isDarkTheme ? '#0f172a' : '#ffffff',
          borderWidth: 2,
        },
      ],
    });
    // --- UPDATED: Added 'cycleSteps' and fixed 'isDarkTheme' ---
  }, [breakdownType, period, isDarkTheme, cycleSteps]);

  // --- Chart Options ---
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          // --- UPDATED: Use 'isDarkTheme' ---
          color: isDarkTheme ? '#e2e8f0' : '#1e293b',
          padding: 20,
          font: { size: 12 },
          boxWidth: 15,
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += context.parsed.toLocaleString();
            }
            return label;
          }
        }
      },
      datalabels: { display: false }
    },
  };

  return <Doughnut options={options} data={chartData} />;
};

export default BreakdownChart;