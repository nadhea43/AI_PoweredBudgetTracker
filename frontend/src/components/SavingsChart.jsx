import { LineChart,Line, XAxis,YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function SavingsChart({data, goalAmount}) {
    return(
        <div>
            <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data} margin={{top:5, right:10, left:0, bottom:5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="month" tick={{fontSize:12}}/>
                    <YAxis
                        tick={{fontSize:12}}
                        tickFormatter={(v) => `RM${(v/1000).toFixed(0)}k`}
                    />
                    <Tooltip
                        formatter={(value) => [`RM ${value.toLocaleString()}`, "Projected savings"]} 
                    />
                    {/* Savings line */}
                    <Line
                    type="monotone"
                    dataKey="projected_savings"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{fill: "#2563eb", r:4}}
                    />
                </LineChart>
            </ResponsiveContainer>

            {/* Goal indicator */}
            <p className="text-center text-xs text-gray-400 mt-1">
                Your goal: RM {goalAmount?.toLocaleString()}
            </p>
        </div>
    )

}