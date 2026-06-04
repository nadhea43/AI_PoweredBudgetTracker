import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

export default function SavingsChart({ data, goalAmount, targetMonths }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data?.length) return;
    if (chartRef.current) chartRef.current.destroy();

    const finalProjected = data[data.length - 1]?.projected_savings ?? 0;
    const yMax = Math.ceil(Math.max(goalAmount ?? 0, finalProjected) * 1.2 / 1000) * 1000;

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: data.map((d) => d.month),
        datasets: [
          {
            label: "Your savings trajectory",
            data: data.map((d) => d.projected_savings),
            borderColor: "#2563eb",
            backgroundColor: "rgba(37,99,235,0.08)",
            borderWidth: 2.5,
            pointBackgroundColor: "#2563eb",
            pointRadius: 5,
            fill: true,
            tension: 0.3,
          },
          {
            label: "Minimum pace to hit goal",
            data: data.map((d) => d.needed_savings),
            borderColor: "#f59e0b",
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 0,
            fill: false,
            tension: 0,
          },
          {
            label: "Your savings goal",
            data: data.map(() => goalAmount),
            borderColor: "#16a34a",
            borderWidth: 1.5,
            borderDash: [8, 4],
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(255,255,255,0.95)",
            borderColor: "#e5e7eb",
            borderWidth: 1,
            titleColor: "#374151",
            bodyColor: "#6b7280",
            padding: 10,
            callbacks: {
              title: (items) => `Month ${items[0].label}`,
              label: (ctx) => {
                const val = ctx.parsed.y;
                const pct = goalAmount ? Math.round((val / goalAmount) * 100) : 0;
                if (ctx.dataset.label === "Your savings goal")
                  return `  🎯 Goal: RM ${val.toLocaleString()}`;
                if (ctx.dataset.label === "Minimum pace to hit goal")
                  return `  📉 Min needed: RM ${val.toLocaleString()}`;
                return `  💰 Your savings: RM ${val.toLocaleString()} (${pct}% of goal)`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: "rgba(0,0,0,0.04)" },
            ticks: { autoSkip: false, font: { size: 11 } },
          },
          y: {
            min: 0,
            max: yMax,
            grid: { color: "rgba(0,0,0,0.04)" },
            ticks: {
              callback: (v) => `RM${(v / 1000).toFixed(0)}k`,
              maxTicksLimit: 6,
              font: { size: 11 },
            },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [data, goalAmount, targetMonths]);

  // ── Status logic ──────────────────────────────────────────────
  const finalProjected = data?.[data.length - 1]?.projected_savings ?? 0;
  const monthHit       = data?.findIndex((d) => d.projected_savings >= goalAmount);
  const onTrack        = goalAmount > 0 && monthHit !== -1;
  const shortfall      = goalAmount ? Math.round(goalAmount - finalProjected) : 0;
  const monthsAhead    = onTrack ? targetMonths - (monthHit + 1) : 0;

  // Monthly saveable = M1 projected (first data point)
  const monthlySaveable = data?.[0]?.projected_savings ?? 0;
  const monthlyNeeded   = data?.[0]?.needed_savings ?? 0;
  const extraPerMonth   = Math.round(monthlySaveable - monthlyNeeded);

  return (
    <div>
      {/* Chart title + subtitle */}
      <h2 className="font-semibold text-gray-800 mb-1">
        Savings Projection
      </h2>
      <p className="text-xs text-gray-400 mb-3">
        Tracking your path to RM {goalAmount?.toLocaleString()} over {targetMonths} months
      </p>

      {/* Legend — friendly labels */}
      <div className="flex flex-wrap gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#2563eb", display: "inline-block" }} />
          <span className="text-xs text-gray-600">
            Your savings trajectory
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ width: 14, height: 2, background: "#f59e0b", display: "inline-block" }} />
          <span className="text-xs text-gray-600">
            Minimum pace to hit goal
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ width: 14, height: 2, background: "#16a34a", display: "inline-block" }} />
          <span className="text-xs text-gray-600">
            Your goal (RM {goalAmount?.toLocaleString()})
          </span>
        </div>
      </div>

      {/* Chart canvas */}
      <div style={{ position: "relative", width: "100%", height: 220 }}>
        <canvas ref={canvasRef} role="img" aria-label="Savings projection chart" />
      </div>

      {/* How to read this chart */}
      <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p className="text-xs font-medium text-gray-600 mb-1">📖 How to read this chart</p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>
            <span className="text-blue-500 font-medium">Blue line</span>
            {" "}— How much you can save each month based on your remaining cash (RM {monthlySaveable.toLocaleString()}/month)
          </li>
          <li>
            <span className="text-yellow-500 font-medium">Amber dashed</span>
            {" "}— The minimum you need to save each month to hit your goal on time (RM {monthlyNeeded.toLocaleString()}/month)
          </li>
          <li>
            <span className="text-green-500 font-medium">Green dashed</span>
            {" "}— Your savings target of RM {goalAmount?.toLocaleString()}
          </li>
        </ul>
      </div>

      {/* Status badge */}
      {goalAmount > 0 && (
        <div className={`mt-3 px-4 py-3 rounded-lg ${
          onTrack ? "bg-green-50 border border-green-100" : "bg-yellow-50 border border-yellow-100"
        }`}>
          {onTrack ? (
            <>
              <p className="text-sm font-semibold text-green-700">
                ✓ You are on track!
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                At RM {monthlySaveable.toLocaleString()}/month, you will reach RM {goalAmount?.toLocaleString()} by{" "}
                <strong>month {monthHit + 1}</strong>
                {monthsAhead > 0 && ` — ${monthsAhead} month${monthsAhead > 1 ? "s" : ""} ahead of your ${targetMonths}-month target`}.
              </p>
              {extraPerMonth > 0 && (
                <p className="text-xs text-green-500 mt-1">
                  💡 You are saving RM {extraPerMonth.toLocaleString()} more than the minimum each month.
                  You can use this extra as a spending buffer or reach your goal even faster.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-yellow-700">
                ⚠️ Goal not reachable within {targetMonths} months
              </p>
              <p className="text-xs text-yellow-600 mt-0.5">
                At your current pace you will be short by{" "}
                <strong>RM {shortfall.toLocaleString()}</strong> after {targetMonths} months.
              </p>
              <p className="text-xs text-yellow-500 mt-1">
                💡 Try saving an extra RM {Math.round(shortfall / targetMonths).toLocaleString()}/month,
                or extend your target timeline to reach RM {goalAmount?.toLocaleString()}.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}