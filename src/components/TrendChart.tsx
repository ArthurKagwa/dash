"use client";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend,
    ChartOptions
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend
);

type TrendChartProps = {
    labels: string[];
    data: (number | null)[];
    label: string;
    timestamps?: (string | null)[];
    borderColor?: string;
    backgroundColor?: string;
    suggestedMax?: number;
    suggestedMin?: number;
};

export function TrendChart({
    labels,
    data,
    label,
    timestamps,
    borderColor = "#0BA6DF",
    backgroundColor = "rgba(11, 166, 223, 0.12)",
    suggestedMax,
    suggestedMin
}: TrendChartProps) {
    const axisColor = "rgba(235, 235, 235, 0.28)";
    const gridColor = "rgba(235, 235, 235, 0.12)";
    const hoverLinePlugin = {
        id: "hoverLine",
        afterDraw(chart: ChartJS) {
            const activeElements = chart.getActiveElements();
            if (!activeElements?.length) {
                return;
            }
            const { ctx, chartArea, scales } = chart;
            const xScale = scales.x;
            const active = activeElements[0];
            const x = xScale.getPixelForValue(active.index);
            ctx.save();
            ctx.setLineDash([6, 6]);
            ctx.lineWidth = 1.3;
            ctx.strokeStyle = "rgba(11, 166, 223, 0.55)";
            ctx.beginPath();
            ctx.moveTo(x, chartArea.top);
            ctx.lineTo(x, chartArea.bottom);
            ctx.stroke();
            ctx.restore();
        }
    };

    const options: ChartOptions<"line"> = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 400,
            easing: "easeOutQuart"
        },
        interaction: {
            mode: "index",
            intersect: false,
            axis: "x"
        },
        plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: {
                mode: "index",
                intersect: false,
                backgroundColor: "rgba(12, 20, 36, 0.88)",
                borderColor: "rgba(11, 166, 223, 0.55)",
                borderWidth: 1,
                padding: 12,
                titleAlign: "left",
                bodyAlign: "left",
                titleFont: {
                    family: "Orbitron, Inter, sans-serif",
                    weight: 600,
                    size: 12
                },
                bodyFont: {
                    family: "Inter, Segoe UI, sans-serif",
                    weight: 500,
                    size: 12
                },
                titleColor: "#0BA6DF",
                bodyColor: "#F4F6FB",
                displayColors: false,
                callbacks: {
                    label(context) {
                        const value = context.parsed.y;
                        const datasetLabel = context.dataset.label ?? "Value";
                        if (value === null || value === undefined) {
                            return `${datasetLabel}: n/a`;
                        }
                        const formatted = Number.isInteger(value)
                            ? value.toString()
                            : value.toFixed(2);
                        return `${datasetLabel}: ${formatted}`;
                    },
                    title(items) {
                        if (!items.length) {
                            return "";
                        }
                        const index = items[0].dataIndex;
                        if (timestamps && timestamps[index]) {
                            const fullDate = new Date(timestamps[index]!);
                            return fullDate.toLocaleString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit"
                            });
                        }
                        return items[0].label ?? "";
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { color: gridColor },
                ticks: {
                    color: axisColor,
                    font: { size: 11, family: "Inter, Segoe UI, sans-serif" }
                }
            },
            y: {
                beginAtZero: suggestedMin === 0,
                suggestedMax,
                suggestedMin,
                grid: { color: gridColor },
                ticks: {
                    color: axisColor,
                    font: { size: 11, family: "Inter, Segoe UI, sans-serif" }
                }
            }
        }
    };

    return (
        <Line
            options={options}
            data={{
                labels,
                datasets: [
                    {
                        label,
                        data,
                        borderColor,
                        backgroundColor,
                        borderWidth: 2,
                        tension: 0.2,
                        fill: {
                            target: "origin",
                            above: backgroundColor
                        },
                        pointRadius: 3,
                        pointHoverRadius: 6,
                        pointBackgroundColor: "rgba(235, 235, 235, 0.85)",
                        pointBorderColor: borderColor,
                        pointBorderWidth: 2,
                        pointHoverBackgroundColor: borderColor,
                        pointHoverBorderColor: "rgba(244, 246, 251, 0.9)"
                    }
                ]
            }}
            plugins={[hoverLinePlugin]}
        />
    );
}
