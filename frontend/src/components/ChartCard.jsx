import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { rupiah } from "../utils/storage";

export default function ChartCard({ title, subtitle, data = [], type = "bar" }) {
  const Chart = type === "line" ? LineChart : BarChart;
  const safeData = Array.isArray(data) ? data : [];
  return (
    <div className="glass-card p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-primary">{title}</h3>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={safeData}>
            <CartesianGrid stroke="#e5eeff" vertical={false} />
            <XAxis dataKey="name" stroke="#424752" />
            <YAxis tickFormatter={(value) => `${Math.round(value / 1000000)}jt`} stroke="#424752" />
            <Tooltip formatter={(value) => rupiah(value)} />
            {type === "line" ? <Line type="monotone" dataKey="sales" stroke="#003f87" strokeWidth={3} dot /> : <Bar dataKey="sales" fill="#003f87" radius={[12, 12, 0, 0]} />}
          </Chart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
