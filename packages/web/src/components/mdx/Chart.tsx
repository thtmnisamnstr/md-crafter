import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

type ChartType = 'line' | 'bar' | 'pie' | 'area';

interface ChartProps {
  type?: ChartType;
  data?: ChartData<'line' | 'bar' | 'pie'>;
  options?: ChartOptions<'line' | 'bar' | 'pie'>;
  height?: number;
  title?: string;
}

export function Chart({ type = 'line', data, options, height = 280, title }: ChartProps) {
  if (!data || !Array.isArray(data.datasets) || data.datasets.length === 0) {
    return (
      <div className="my-4 rounded border border-tab-border p-3 text-sm" style={{ opacity: 0.7 }}>
        Chart component requires a valid <code>data</code> prop.
      </div>
    );
  }

  const sharedOptions: ChartOptions<'line' | 'bar' | 'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
      },
      title: {
        display: !!title,
        text: title,
      },
    },
    ...options,
  };

  const areaData: ChartData<'line'> = type === 'area'
    ? {
      labels: data.labels,
      datasets: data.datasets.map((dataset) => ({
        ...dataset,
        fill: true,
      })) as ChartData<'line'>['datasets'],
    }
    : (data as ChartData<'line'>);

  return (
    <div className="my-4 rounded border border-tab-border p-3" style={{ background: 'var(--sidebar-bg)' }}>
      <div style={{ height: `${height}px` }}>
        {(type === 'line' || type === 'area') && (
          <Line data={areaData} options={sharedOptions as ChartOptions<'line'>} />
        )}
        {type === 'bar' && (
          <Bar data={data as ChartData<'bar'>} options={sharedOptions as ChartOptions<'bar'>} />
        )}
        {type === 'pie' && (
          <Pie data={data as ChartData<'pie'>} options={sharedOptions as ChartOptions<'pie'>} />
        )}
      </div>
    </div>
  );
}
