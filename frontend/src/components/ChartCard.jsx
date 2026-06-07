import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { rupiah } from "../utils/storage";

export default function ChartCard({
  title,
  subtitle,
  data = [],
  type = "bar",
  valueKey = "sales",
  tooltipFormatter = (value) => rupiah(value),
  yAxisFormatter = (value) => `${Math.round(value / 1000000)}jt`,
  hideHeader = false,
  className = "",
  chartHeight = "h-72"
}) {
  const Chart = type === "line" ? LineChart : BarChart;
  const safeData = Array.isArray(data) ? data : [];
  return (
    <div className={`glass-card p-6 ${className}`}>
      {!hideHeader && (
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-primary">{title}</h3>
            <p className="text-sm text-muted">{subtitle}</p>
          </div>
        </div>
      )}
      <div className={chartHeight}>
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={safeData}>
            <CartesianGrid stroke="#e5eeff" vertical={false} />
            <XAxis dataKey="name" stroke="#424752" />
            <YAxis tickFormatter={yAxisFormatter} stroke="#424752" />
            <Tooltip formatter={tooltipFormatter} />
            {type === "line" ? <Line type="monotone" dataKey={valueKey} stroke="#003f87" strokeWidth={3} dot /> : <Bar dataKey={valueKey} fill="#003f87" radius={[12, 12, 0, 0]} />}
          </Chart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
