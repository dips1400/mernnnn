import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels'; 
import './App.css';
import TransactionList from './components/TransactionList';
import Img1 from "./img/pic1.jpeg"

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartDataLabels
);

const App = () => {
  const [statistics, setStatistics] = useState({});
  const [barChartData, setBarChartData] = useState([]);
  const [pieChartData, setPieChartData] = useState([]);
  const [month, setMonth] = useState('March');
  
  useEffect(() => {
    const fetchCombinedData = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/combined-statistics', { params: { month } });
        setStatistics(response.data.statistics);
        setBarChartData(response.data.barChartData);
        setPieChartData(response.data.pieChartData);
      } catch (error) {
        console.error('Error fetching combined data:', error);
      }
    };
    
    fetchCombinedData();
  }, [month]);

  

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Bar Chart Data Formatting
  const barChart = {
    labels: barChartData.length > 0 ? barChartData.map((range) => range.priceRange) : ['No data'],
    datasets: [
      {
        label: 'Number of Items',
        data: barChartData.length > 0 ? barChartData.map((range) => range.count) : [0],
        backgroundColor: 'rgb(135, 107, 229)',
        borderColor: 'rgb(105, 83, 174)',
        borderWidth: 1
      }
    ]
  };

  // Pie Chart Data Formatting
  const pieChart = {
    labels: pieChartData.map((category) => category._id),
    datasets: [
      {
        data: pieChartData.map((category) => category.count),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#FF5733', '#9B59B6'],
      }
    ],
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: function (tooltipItem) {
              return `${tooltipItem.label}: ${tooltipItem.raw} items`;
            }
          }
        },
        datalabels: {
          display: true,
          formatter: (value, ctx) => {
            let total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            let percentage = ((value / total) * 100).toFixed(2);
            return `${percentage}%`;
          },
          color: '#fff',
          font: {
            weight: 'bold',
            size: 14
          }
        }
      }
    }
  };

  return (
    <div className="App">
      <div className='content1'>
      <h1>Transaction Dashboard</h1>
      
      <select value={month} onChange={(e) => setMonth(e.target.value)}>
        {months.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <div className='profile'>
        <div className='circle'>
          <img src={Img1} alt="pic" height={55} width={55} style={{borderRadius:"50%"}} />
        </div>
      </div>

      </div>

      <TransactionList month={month}/>

      
      <h3>Statistics for {month}</h3>
      <div className="statistics-box">
        <p>Total Sale Amount: ${statistics.totalSaleAmount}</p>
        <p>Total Sold Items: {statistics.soldItems}</p>
        <p>Total Not Sold Items: {statistics.notSoldItems}</p>
      </div>

      <div className='diagram'>
      <div style={{height:"350px", width:"50%"}}>
        <h3>Price Range Bar Chart</h3>
        <Bar data={barChart} />
      </div>

      <div style={{ width: '50%', height: '290px', margin: '0 auto', alignItems:"center", display:"flex", flexDirection:"column" }}>
        <h3>Category Distribution Pie Chart</h3>
        <Pie data={pieChart} 
        options={{
          responsive: true,
          plugins: {
            legend: {
              position: 'top', 
            },
            tooltip: {
              callbacks: {
                label: (tooltipItem) => {
                  return `${tooltipItem.label}: ${tooltipItem.raw} items`;
                },
              },
            },
          },
        }}
        width={100} 
        height={100} 
        />
  

      </div>
      </div>

    </div>
  );
};

export default App;

