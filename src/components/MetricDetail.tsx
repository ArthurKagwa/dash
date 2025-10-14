"use client";

import Link from "next/link";
import { useMemo, useState, ChangeEvent } from "react";
import { TrendChart } from "./TrendChart";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartOptions
} from "chart.js";
import { Bar } from "react-chartjs-2";
import styles from "./MetricDetail.module.css";
import type { MetricConfig } from "@/lib/metricConfig";
import {
    buildMetricPoints,
    computeMetricAggregates,
    deriveDifferentialSeries
} from "@/lib/metricAnalytics";
import type { MetricAggregates } from "@/lib/metricAnalytics";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type ChartPoint = {
    timestamp: string | null;
    value: number | null;
};

type MetricDetailProps = {
    metric: MetricConfig;
    chartPoints: ChartPoint[];
    channelName?: string;
    error?: string | null;
};

const TIME_RANGE_OPTIONS = [
    { label: "Last 30 minutes", minutes: 30 },
    { label: "Last 1 hour", minutes: 60 },
    { label: "Last 6 hours", minutes: 360 },
    { label: "Last 12 hours", minutes: 720 },
    { label: "Last 24 hours", minutes: 1440 },
    { label: "Last 3 days", minutes: 4320 },
    { label: "Last 7 days", minutes: 10080 },
    { label: "Last 30 days", minutes: 43200 },
    { label: "Last 90 days", minutes: 60 * 24 * 90 }
] as const;

export function MetricDetail({ metric, chartPoints, channelName, error }: MetricDetailProps) {
    const [rangeMinutes, setRangeMinutes] = useState<number>(1440);
    const isCumulative = Boolean(metric.isCumulative);
    const isMotionMetric = metric.slug === "motion" && isCumulative;

    const normalizedPoints = useMemo(
        () => (isCumulative ? deriveDifferentialSeries(chartPoints) : chartPoints),
        [chartPoints, isCumulative]
    );

    const filteredPoints = useMemo(
        () => filterPointsByMinutes(normalizedPoints, rangeMinutes),
        [normalizedPoints, rangeMinutes]
    );

    const labels = useMemo(
        () => filteredPoints.map((point) => formatChartLabel(point.timestamp)),
        [filteredPoints]
    );
    const data = useMemo(
        () => filteredPoints.map((point) => point.value),
        [filteredPoints]
    );
    const timestamps = useMemo(
        () => filteredPoints.map((point) => point.timestamp ?? null),
        [filteredPoints]
    );

    const aggregates = useMemo(
        () => computeMetricAggregates(buildMetricPoints(filteredPoints)),
        [filteredPoints]
    );

    const summaryCards = isMotionMetric
        ? [
              {
                  label: "Latest increment",
                  value: formatNumber(aggregates.latestValue, 0, metric.unit),
                  hint: "Events since previous reading"
              },
              {
                  label: "Total in range",
                  value: formatNumber(aggregates.sum, 0, metric.unit),
                  hint: `Across ${aggregates.sampleCount} samples`
              },
              {
                  label: "Minimum increment",
                  value: formatNumber(aggregates.min, 0, metric.unit),
                  hint: "Lowest interval count"
              },
              {
                  label: "Maximum increment",
                  value: formatNumber(aggregates.max, 0, metric.unit),
                  hint: "Highest interval count"
              }
          ]
        : [
              {
                  label: "Current",
                  value: formatNumber(aggregates.latestValue, metric.decimals, metric.unit),
                  hint: "Most recent reading"
              },
              {
                  label: "Average",
                  value: formatNumber(aggregates.average, metric.decimals, metric.unit),
                  hint: `Across ${aggregates.sampleCount} samples`
              },
              {
                  label: "Minimum",
                  value: formatNumber(aggregates.min, metric.decimals, metric.unit),
                  hint: "Recorded floor"
              },
              {
                  label: "Maximum",
                  value: formatNumber(aggregates.max, metric.decimals, metric.unit),
                  hint: "Recorded peak"
              }
          ];

    const timeframeTitle = isMotionMetric ? "Timeframe totals" : "Timeframe averages";
    const timeframeCards = [
        isMotionMetric
            ? {
                  label: "Last Hour",
                  value: formatNumber(aggregates.lastHourTotal, 0, metric.unit),
                  hint: "Events recorded in the latest hour"
              }
            : {
                  label: "Last Hour",
                  value: formatNumber(aggregates.lastHourAverage, metric.decimals, metric.unit),
                  hint: "Average over the latest hour of data"
              },
        isMotionMetric
            ? {
                  label: "Last Day",
                  value: formatNumber(aggregates.lastDayTotal, 0, metric.unit),
                  hint: "Events recorded in the last 24 hours"
              }
            : {
                  label: "Last Day",
                  value: formatNumber(aggregates.lastDayAverage, metric.decimals, metric.unit),
                  hint: "Average across the last 24 hours"
              },
        isMotionMetric
            ? {
                  label: "Last Month",
                  value: formatNumber(aggregates.lastMonthTotal, 0, metric.unit),
                  hint: "Events recorded in the last 30 days"
              }
            : {
                  label: "Last Month",
                  value: formatNumber(aggregates.lastMonthAverage, metric.decimals, metric.unit),
                  hint: "Average across the last 30 days"
              },
        {
            label: "Samples",
            value: aggregates.sampleCount.toString(),
            hint: "Data points inside the selected range"
        }
    ];

    const handleRangeChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const next = Number.parseInt(event.target.value, 10);
        if (Number.isFinite(next) && next > 0) {
            setRangeMinutes(next);
        }
    };

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backLink}>
                    &larr; Back to dashboard
                </Link>
                <h1 className={styles.title}>{metric.title} Insights</h1>
                {channelName && <p className={styles.subtitle}>Channel: {channelName}</p>}
                <p className={styles.meta}>
                    Latest sample: {formatTimestamp(aggregates.latestTimestamp) ?? "Not available"}
                </p>
                {error && <p className={styles.error}>Unable to update data: {error}</p>}
            </header>

            <section className={styles.summarySection}>
                <h2 className={styles.sectionTitle}>At a glance</h2>
                <div className={styles.summaryGrid}>
                    {summaryCards.map((card) => (
                        <StatCard key={card.label} label={card.label} value={card.value} hint={card.hint} />
                    ))}
                </div>
            </section>

            <section className={styles.chartSection}>
                <div className={styles.chartHeader}>
                    <h2 className={styles.sectionTitle}>Trend</h2>
                    <div className={styles.chartControls}>
                        <label htmlFor="range-filter" className={styles.chartControlLabel}>
                            Range
                        </label>
                        <select
                            id="range-filter"
                            className={styles.chartSelect}
                            value={rangeMinutes.toString()}
                            onChange={handleRangeChange}
                        >
                            {TIME_RANGE_OPTIONS.map((option) => (
                                <option key={option.minutes} value={option.minutes.toString()}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {filteredPoints.length ? (
                    <div className={styles.chartWrapper}>
                        <TrendChart
                            labels={labels}
                            data={data}
                            label={metric.chartLabel}
                            timestamps={timestamps}
                            borderColor={metric.borderColor}
                            backgroundColor={metric.backgroundColor}
                            suggestedMin={metric.suggestedMin}
                            suggestedMax={metric.suggestedMax}
                        />
                    </div>
                ) : (
                    <p className={styles.emptyState}>No readings available for this range.</p>
                )}
            </section>

            <section className={styles.summarySection}>
                <h2 className={styles.sectionTitle}>{timeframeTitle}</h2>
                <div className={styles.summaryGrid}>
                    {timeframeCards.map((card) => (
                        <StatCard key={card.label} label={card.label} value={card.value} hint={card.hint} />
                    ))}
                </div>
            </section>

            <section className={styles.bucketSection}>
                <h2 className={styles.sectionTitle}>Aggregated breakdown</h2>
                <div className={styles.bucketGrid}>
                    <BucketBarChart
                        title={isMotionMetric ? "Hourly Totals" : "Hourly Averages"}
                        emptyMessage="No hourly data yet."
                        unit={metric.unit}
                        decimals={metric.decimals}
                        buckets={aggregates.hourlyBuckets}
                        color={metric.borderColor}
                        mode={isMotionMetric ? "total" : "average"}
                    />
                    <BucketBarChart
                        title={isMotionMetric ? "Daily Totals" : "Daily Averages"}
                        emptyMessage="No daily data yet."
                        unit={metric.unit}
                        decimals={metric.decimals}
                        buckets={aggregates.dailyBuckets}
                        color={metric.borderColor}
                        mode={isMotionMetric ? "total" : "average"}
                    />
                    <BucketBarChart
                        title={isMotionMetric ? "Monthly Totals" : "Monthly Averages"}
                        emptyMessage="No monthly data yet."
                        unit={metric.unit}
                        decimals={metric.decimals}
                        buckets={aggregates.monthlyBuckets}
                        color={metric.borderColor}
                        mode={isMotionMetric ? "total" : "average"}
                    />
                </div>
            </section>
        </main>
    );
}

type StatCardProps = {
    label: string;
    value: string;
    hint: string;
};

function StatCard({ label, value, hint }: StatCardProps) {
    return (
        <div className={styles.statCard}>
            <span className={styles.statLabel}>{label}</span>
            <span className={styles.statValue}>{value}</span>
            <span className={styles.statHint}>{hint}</span>
        </div>
    );
}

type BucketBarChartProps = {
    title: string;
    unit: string;
    decimals: number;
    emptyMessage: string;
    buckets: MetricAggregates["hourlyBuckets"];
    color: string;
    mode: "average" | "total";
};

function BucketBarChart({
    title,
    unit,
    decimals,
    emptyMessage,
    buckets,
    color,
    mode
}: BucketBarChartProps) {
    if (!buckets.length) {
        return (
            <div className={styles.bucketGroup}>
                <h3 className={styles.bucketTitle}>{title}</h3>
                <p className={styles.emptyState}>{emptyMessage}</p>
            </div>
        );
    }

    const labels = buckets.map((bucket) => bucket.label);
    const data = buckets.map((bucket) =>
        mode === "total" ? bucket.total ?? 0 : bucket.average ?? 0
    );
    const tooltipLabelPrefix = mode === "total" ? "Total" : "Average";
    const datasetLabel = unit ? `${tooltipLabelPrefix} (${unit})` : tooltipLabelPrefix;

    const options: ChartOptions<"bar"> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: {
                backgroundColor: "rgba(12, 20, 36, 0.88)",
                borderColor: `${color}88`,
                borderWidth: 1,
                padding: 12,
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
                titleColor: color,
                bodyColor: "#F4F6FB",
                displayColors: false,
                callbacks: {
                    label(context) {
                        const value = context.parsed.y;
                        const bucket = buckets[context.dataIndex];
                        const formatted = formatNumber(value, decimals, unit);
                        return [
                            `${tooltipLabelPrefix}: ${formatted}`,
                            `Samples: ${bucket?.count ?? 0}`
                        ];
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { color: "rgba(235, 235, 235, 0.12)" },
                ticks: {
                    color: "rgba(235, 235, 235, 0.28)",
                    font: { size: 10, family: "Inter, Segoe UI, sans-serif" },
                    maxRotation: 45,
                    minRotation: 45
                }
            },
            y: {
                beginAtZero: true,
                grid: { color: "rgba(235, 235, 235, 0.12)" },
                ticks: {
                    color: "rgba(235, 235, 235, 0.28)",
                    font: { size: 11, family: "Inter, Segoe UI, sans-serif" }
                }
            }
        }
    };

    const chartData = {
        labels,
        datasets: [
            {
                label: datasetLabel,
                data,
                backgroundColor: `${color}40`,
                borderColor: color,
                borderWidth: 2,
                borderRadius: 4,
                hoverBackgroundColor: `${color}60`,
                hoverBorderColor: color
            }
        ]
    };

    return (
        <div className={styles.bucketGroup}>
            <h3 className={styles.bucketTitle}>{title}</h3>
            <div className={styles.bucketChartWrapper}>
                <Bar options={options} data={chartData} />
            </div>
        </div>
    );
}

function formatNumber(value: number | null, decimals: number, unit: string) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return "--";
    }
    let formatted: string;
    if (decimals <= 0) {
        formatted = Math.round(value).toString();
    } else if (Number.isInteger(value)) {
        formatted = value.toString();
    } else {
        formatted = value.toFixed(decimals);
        formatted = formatted.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
    }
    const suffix = unit
        ? unit === "%"
            ? unit
            : ` ${unit}`
        : "";
    return `${formatted}${suffix}`;
}

function formatTimestamp(timestamp: string | null | undefined) {
    if (!timestamp) {
        return null;
    }
    const date = new Date(timestamp);
    if (!Number.isFinite(date.getTime())) {
        return null;
    }
    return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function formatChartLabel(timestamp: string | null) {
    if (!timestamp) {
        return "";
    }
    const date = new Date(timestamp);
    if (!Number.isFinite(date.getTime())) {
        return "";
    }
    return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function filterPointsByMinutes(points: ChartPoint[], minutes: number) {
    if (minutes <= 0) {
        return points;
    }
    const cutoff = Date.now() - minutes * 60_000;
    return points.filter((point) => {
        if (!point.timestamp) {
            return false;
        }
        const epoch = Date.parse(point.timestamp);
        return Number.isFinite(epoch) && epoch >= cutoff;
    });
}
