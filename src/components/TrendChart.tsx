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
    borderColor: string;
    backgroundColor: string;
    suggestedMax?: number;
    suggestedMin?: number;
};

export function TrendChart({
    labels,
    data,
    label,
    borderColor,
    backgroundColor,
    suggestedMax,
    suggestedMin
}: TrendChartProps) {
    const options: ChartOptions<"line"> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: false }
        },
        scales: {
            x: {
                grid: { color: "#f0f0f0" },
                ticks: { color: "#666666", font: { size: 11 } }
            },
            y: {
                beginAtZero: suggestedMin === 0,
                suggestedMax,
                suggestedMin,
                grid: { color: "#f0f0f0" },
                ticks: { color: "#666666", font: { size: 11 } }
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
                        borderWidth: 1.5,
                        tension: 0.2,
                        fill: true,
                        pointRadius: 2,
                        pointHoverRadius: 4
                    }
                ]
            }}
        />
    );
}
