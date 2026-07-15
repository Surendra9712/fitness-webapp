import type { DayData, WeeklyData } from "./types";

export function exportWeeklyReportPdf(
  report: WeeklyData,
  userName: string,
  goal: string,
) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  const { summary, daily_data, targets, week_start, week_end } = report;

  const rows = daily_data
    .map(
      (d: DayData) => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:6px 8px">${d.day_name.slice(0, 3)} ${d.date.slice(5)}</td>
      <td style="padding:6px 8px;text-align:center">${Math.round(d.calories)}</td>
      <td style="padding:6px 8px;text-align:center">${Math.round(d.protein_g)}</td>
      <td style="padding:6px 8px;text-align:center">${Math.round(d.carbs_g)}</td>
      <td style="padding:6px 8px;text-align:center">${Math.round(d.fat_g)}</td>
      <td style="padding:6px 8px;text-align:center">${d.meal_count}</td>
      <td style="padding:6px 8px;text-align:center">${Math.round(d.calories_burned)}</td>
      <td style="padding:6px 8px;text-align:center">${d.exercise_minutes}</td>
      <td style="padding:6px 8px;text-align:center">${d.water_ml}</td>
    </tr>`,
    )
    .join("");

  win.document.write(`<!DOCTYPE html><html><head>
    <title>SmartDiet Pro — Weekly Report</title>
    <style>
      body{font-family:Arial,sans-serif;padding:32px;color:#111;font-size:13px}
      h1{color:#059669;margin-bottom:4px}
      h2{color:#059669;font-size:15px;margin:24px 0 8px}
      .meta{color:#666;font-size:12px;margin-bottom:24px}
      .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
      .stat{background:#f0fdf4;border:1px solid #d1fae5;border-radius:8px;padding:12px;text-align:center}
      .stat-val{font-size:22px;font-weight:700;color:#059669}
      .stat-label{font-size:11px;color:#6b7280;margin-top:2px}
      table{width:100%;border-collapse:collapse;margin-bottom:24px}
      th{background:#f0fdf4;padding:8px;text-align:left;font-size:12px;color:#374151}
      td{font-size:12px}
      .footer{color:#9ca3af;font-size:11px;text-align:center;margin-top:32px;border-top:1px solid #eee;padding-top:16px}
      @media print{body{padding:16px}}
    </style>
  </head><body>
    <h1>SmartDiet Pro — Weekly Nutrition & Exercise Report</h1>
    <div class="meta">
      <b>User:</b> ${userName} &nbsp;|&nbsp;
      <b>Goal:</b> ${goal} &nbsp;|&nbsp;
      <b>Period:</b> ${week_start} to ${week_end} &nbsp;|&nbsp;
      <b>Generated:</b> ${new Date().toLocaleDateString()}
    </div>

    <h2>📊 Weekly Nutrition Summary</h2>
    <div class="grid">
      <div class="stat"><div class="stat-val">${Math.round(summary.avg_calories)}</div><div class="stat-label">Avg Calories/day</div></div>
      <div class="stat"><div class="stat-val">${Math.round(summary.avg_protein_g)}g</div><div class="stat-label">Avg Protein/day</div></div>
      <div class="stat"><div class="stat-val">${Math.round(summary.avg_carbs_g)}g</div><div class="stat-label">Avg Carbs/day</div></div>
      <div class="stat"><div class="stat-val">${Math.round(summary.avg_fat_g)}g</div><div class="stat-label">Avg Fat/day</div></div>
      <div class="stat"><div class="stat-val">${summary.adherence_pct}%</div><div class="stat-label">Goal Adherence</div></div>
      <div class="stat"><div class="stat-val">${summary.days_logged}/7</div><div class="stat-label">Days Logged</div></div>
      <div class="stat"><div class="stat-val">${summary.total_meals}</div><div class="stat-label">Total Meals</div></div>
      <div class="stat"><div class="stat-val">${Math.round(summary.avg_water_ml)}ml</div><div class="stat-label">Avg Water/day</div></div>
    </div>

    <h2>🏋️ Weekly Exercise Summary</h2>
    <div class="grid">
      <div class="stat"><div class="stat-val">${summary.total_workouts}</div><div class="stat-label">Total Workouts</div></div>
      <div class="stat"><div class="stat-val">${summary.total_exercise_mins}m</div><div class="stat-label">Total Active Time</div></div>
      <div class="stat"><div class="stat-val">${Math.round(summary.total_calories_burned)}</div><div class="stat-label">Calories Burned</div></div>
      <div class="stat"><div class="stat-val">${summary.most_frequent_exercise || "—"}</div><div class="stat-label">Most Done Exercise</div></div>
    </div>

    <h2>💧 Hydration Summary</h2>
    <div class="grid">
      <div class="stat"><div class="stat-val">${Math.round(summary.avg_water_ml)}ml</div><div class="stat-label">Avg Water/Day</div></div>
      <div class="stat"><div class="stat-val">${summary.water_target_ml}ml</div><div class="stat-label">Daily Target</div></div>
      <div class="stat"><div class="stat-val">${Math.round((summary.avg_water_ml / summary.water_target_ml) * 100)}%</div><div class="stat-label">Avg Hydration %</div></div>
      <div class="stat"><div class="stat-val">${daily_data.filter((d: DayData) => d.water_ml >= summary.water_target_ml).length}/7</div><div class="stat-label">Days Target Met</div></div>
    </div>

    <h2>📅 Daily Breakdown</h2>
    <table>
      <thead><tr>
        <th>Day</th><th>Calories</th><th>Protein(g)</th><th>Carbs(g)</th><th>Fat(g)</th>
        <th>Meals</th><th>Cal Burned</th><th>Ex.Min</th><th>Water(ml)</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr style="font-weight:700;background:#f9fafb">
        <td style="padding:8px">Targets</td>
        <td style="padding:8px;text-align:center">${Math.round(targets.calories)}</td>
        <td style="padding:8px;text-align:center">${Math.round(targets.protein_g)}</td>
        <td style="padding:8px;text-align:center">${Math.round(targets.carbs_g)}</td>
        <td style="padding:8px;text-align:center">${Math.round(targets.fat_g)}</td>
        <td colspan="4"></td>
      </tr></tfoot>
    </table>
    <div class="footer">SmartDiet Pro · AI-Powered Nutrition Tracking · Nepal</div>
    <script>window.onload=()=>{window.print();}</script>
  </body></html>`);
  win.document.close();
}
