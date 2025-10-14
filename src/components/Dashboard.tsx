"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import styles from "./Dashboard.module.css";
import { MetricCard } from "./MetricCard";
import { ThingSpeakFeed } from "@/types/thingspeak";
import { buildSnapshot, mapSeries, DEFAULT_RANGE_MINUTES } from "@/lib/thingspeak";
import { METRIC_CONFIG } from "@/lib/metricConfig";
import type { MetricConfig } from "@/lib/metricConfig";
import {
    buildMetricPoints,
    computeMetricAggregates,
    deriveDifferentialSeries
} from "@/lib/metricAnalytics";
import type { MetricAggregates } from "@/lib/metricAnalytics";

type DashboardProps = {
    initialFeeds: ThingSpeakFeed[];
    channelName?: string;
    refreshInterval?: number;
    initialError?: string | null;
    initialRangeMinutes?: number;
};

const DEFAULT_INTERVAL = 60000;
const RESULTS = 50;
const REFRESH_OPTIONS = [
    { label: "30 seconds", value: 30000 },
    { label: "1 minute", value: 60000 },
    { label: "5 minutes", value: 300000 },
    { label: "Manual", value: 0 }
] as const;

export function Dashboard({
    initialFeeds,
    channelName,
    refreshInterval = DEFAULT_INTERVAL,
    initialError = null,
    initialRangeMinutes = DEFAULT_RANGE_MINUTES
}: DashboardProps) {
    const [feeds, setFeeds] = useState<ThingSpeakFeed[]>(initialFeeds);
    const [error, setError] = useState<string | null>(initialError);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshMs, setRefreshMs] = useState(
        refreshInterval >= 0 ? refreshInterval : DEFAULT_INTERVAL
    );

    useEffect(() => {
        setFeeds(initialFeeds);
    }, [initialFeeds]);

    useEffect(() => {
        setRefreshMs(refreshInterval >= 0 ? refreshInterval : DEFAULT_INTERVAL);
    }, [refreshInterval]);

    useEffect(() => {
        let cancelled = false;

        async function refreshFeeds() {
            setIsRefreshing(true);
            try {
                const query = `results=${RESULTS}`;

                const response = await fetch(`/api/thingspeak?${query}`, {
                    cache: "no-store"
                });
                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }
                const data = (await response.json()) as { feeds?: ThingSpeakFeed[] };
                if (!cancelled) {
                    setFeeds(data.feeds ?? []);
                    setError(null);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Unknown error.");
                }
            } finally {
                if (!cancelled) {
                    setIsRefreshing(false);
                }
            }
        }

        if (refreshMs <= 0) {
            void refreshFeeds();
            return () => {
                cancelled = true;
            };
        }

        void refreshFeeds();
        const timer = setInterval(refreshFeeds, refreshMs);

        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [refreshMs]);

    const handleIntervalChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const nextValue = Number.parseInt(event.target.value, 10);
        if (Number.isFinite(nextValue)) {
            setRefreshMs(nextValue);
        }
    };

    const snapshot = useMemo(() => buildSnapshot(feeds), [feeds]);
    const rawSeries = useMemo(() => mapSeries(feeds), [feeds]);

    const temperatureChartPoints = useMemo(
        () =>
            rawSeries.map((point) => ({
                timestamp: point.timestamp ?? null,
                value: point.temperature ?? null
            })),
        [rawSeries]
    );

    const humidityChartPoints = useMemo(
        () =>
            rawSeries.map((point) => ({
                timestamp: point.timestamp ?? null,
                value: point.humidity ?? null
            })),
        [rawSeries]
    );

    const motionChartPoints = useMemo(() => {
        const base = rawSeries.map((point) => ({
            timestamp: point.timestamp ?? null,
            value: point.motion ?? null
        }));
        if (!METRIC_CONFIG.motion.isCumulative) {
            return base;
        }
        return deriveDifferentialSeries(base);
    }, [rawSeries]);

    const batteryChartPoints = useMemo(
        () =>
            rawSeries.map((point) => ({
                timestamp: point.timestamp ?? null,
                value: point.battery ?? null
            })),
        [rawSeries]
    );

    const temperatureAggregates = useMemo(
        () => computeMetricAggregates(buildMetricPoints(temperatureChartPoints)),
        [temperatureChartPoints]
    );

    const humidityAggregates = useMemo(
        () => computeMetricAggregates(buildMetricPoints(humidityChartPoints)),
        [humidityChartPoints]
    );

    const motionAggregates = useMemo(
        () => computeMetricAggregates(buildMetricPoints(motionChartPoints)),
        [motionChartPoints]
    );

    const batteryAggregates = useMemo(
        () => computeMetricAggregates(buildMetricPoints(batteryChartPoints)),
        [batteryChartPoints]
    );

    const analytics = useMemo(() => {
        const totalReadings = rawSeries.length;
        const firstReading = rawSeries[0]?.timestamp ?? null;
        const lastReading = rawSeries[rawSeries.length - 1]?.timestamp ?? null;
        let durationMinutes: number | null = null;
        if (firstReading && lastReading) {
            const firstTime = Date.parse(firstReading);
            const lastTime = Date.parse(lastReading);
            if (Number.isFinite(firstTime) && Number.isFinite(lastTime)) {
                durationMinutes = Math.max(0, Math.round((lastTime - firstTime) / 60000));
            }
        }

        return {
        
            firstReading,
            lastReading,
            temperature: temperatureAggregates,
            humidity: humidityAggregates,
            motion: {
                aggregates: motionAggregates,
                total: motionAggregates.sum
            },
            battery: batteryAggregates
        };
    }, [
        rawSeries,
        temperatureAggregates,
        humidityAggregates,
        motionAggregates,
        batteryAggregates
    ]);

    return (
        <main className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>IoT Environmental Monitoring Dashboard</h1>
                <div className={styles.channelName}>
                    {channelName ? `Channel: ${channelName}` : "Channel name unavailable"}
                </div>
                <p className={styles.lastUpdate}>
                    {snapshot.timestamp
                        ? `Last updated: ${formatTimestamp(snapshot.timestamp)}`
                        : "Waiting for ThingSpeak data..."}
                </p>
                <div className={styles.controls}>
                    <div className={styles.controlGroup}>
                        <label htmlFor="refresh-interval" className={styles.controlLabel}>
                            Auto-refresh interval:
                        </label>
                        <select
                            id="refresh-interval"
                            className={styles.select}
                            value={refreshMs.toString()}
                            onChange={handleIntervalChange}
                        >
                            {REFRESH_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value.toString()}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <span className={styles.controlHint}>
                            {formatIntervalHint(refreshMs)}
                        </span>
                    </div>
                </div>
                {error && <p className={styles.status}>Unable to refresh data: {error}</p>}
                {!error && isRefreshing && <p className={styles.status}>Refreshing data...</p>}
            </header>

            <section className={styles.metrics}>
                <MetricCard
                    title="Temperature"
                    value={formatValue(snapshot.temperature, 2)}
                    unit="deg C"
                    href={METRIC_CONFIG.temperature.path}
                />
                <MetricCard
                    title="Humidity"
                    value={formatValue(snapshot.humidity, 1)}
                    unit="%"
                    href={METRIC_CONFIG.humidity.path}
                />
                <MetricCard
                    title="Motion Events"
                    value={formatInteger(snapshot.motionCount)}
                    unit={formatCountUnit(snapshot.motionCount)}
                    href={METRIC_CONFIG.motion.path}
                />
                <MetricCard
                    title="Battery Voltage"
                    value={formatValue(snapshot.batteryVoltage, 3)}
                    unit="V"
                    href={METRIC_CONFIG.battery.path}
                />
            </section>

            <section className={styles.analyticsSection}>
                <h2 className={styles.sectionTitle}>Data Collection Analytics</h2>
                <div className={styles.analyticsGrid}>
  
                    <MetricAnalyticsCard
                        title="Temperature"
                        config={METRIC_CONFIG.temperature}
                        aggregates={analytics.temperature}
                    />
                    <MetricAnalyticsCard
                        title="Humidity"
                        config={METRIC_CONFIG.humidity}
                        aggregates={analytics.humidity}
                    />
                    <MetricAnalyticsCard
                        title="Motion Events"
                        config={METRIC_CONFIG.motion}
                        aggregates={analytics.motion.aggregates}
                        extraLabel="Total events"
                        extraValue={formatMetricWithUnit(
                            analytics.motion.total,
                            0,
                            METRIC_CONFIG.motion.unit
                        )}
                    />
                    <MetricAnalyticsCard
                        title="Battery Voltage"
                        config={METRIC_CONFIG.battery}
                        aggregates={analytics.battery}
                    />
                </div>
            </section>
        </main>
    );
}

type MetricAnalyticsCardProps = {
    title: string;
    config: MetricConfig;
    aggregates: MetricAggregates;
    extraLabel?: string;
    extraValue?: string;
};

function MetricAnalyticsCard({
    title,
    config,
    aggregates,
    extraLabel,
    extraValue
}: MetricAnalyticsCardProps) {
    const isCumulative = Boolean(config.isCumulative);
    const isMotion = config.slug === "motion" && isCumulative;
    const primaryValue = isMotion
        ? formatMetricWithUnit(aggregates.sum, 0, config.unit)
        : formatMetricWithUnit(aggregates.average, config.decimals, config.unit);
    const lastHourValue = isMotion
        ? formatMetricWithUnit(aggregates.lastHourTotal, 0, config.unit)
        : formatMetricWithUnit(aggregates.lastHourAverage, config.decimals, config.unit);
    const lastDayValue = isMotion
        ? formatMetricWithUnit(aggregates.lastDayTotal, 0, config.unit)
        : formatMetricWithUnit(aggregates.lastDayAverage, config.decimals, config.unit);
    const lastMonthValue = isMotion
        ? formatMetricWithUnit(aggregates.lastMonthTotal, 0, config.unit)
        : formatMetricWithUnit(aggregates.lastMonthAverage, config.decimals, config.unit);
    const rangeMin = formatMetricWithUnit(aggregates.min, config.decimals, config.unit);
    const rangeMax = formatMetricWithUnit(aggregates.max, config.decimals, config.unit);
    const extraDisplay = extraValue ?? null;

    return (
        <div className={styles.analyticsCard}>
            <h3 className={styles.analyticsLabel}>{title}</h3>
            <p className={styles.analyticsValue}>{primaryValue}</p>
            <p className={styles.analyticsRange}>
                Range:{" "}
                {rangeMin} - {rangeMax}
            </p>
            <div className={styles.analyticsHighlights}>
                <div className={styles.analyticsHighlight}>
                    <span className={styles.analyticsHighlightLabel}>Last hour</span>
                    <span className={styles.analyticsHighlightValue}>{lastHourValue}</span>
                </div>
                <div className={styles.analyticsHighlight}>
                    <span className={styles.analyticsHighlightLabel}>Last day</span>
                    <span className={styles.analyticsHighlightValue}>{lastDayValue}</span>
                </div>
                <div className={styles.analyticsHighlight}>
                    <span className={styles.analyticsHighlightLabel}>Last month</span>
                    <span className={styles.analyticsHighlightValue}>{lastMonthValue}</span>
                </div>
                <div className={styles.analyticsHighlight}>
                    <span className={styles.analyticsHighlightLabel}>Samples</span>
                    <span className={styles.analyticsHighlightValue}>
                        {aggregates.sampleCount.toString()}
                    </span>
                </div>
            </div>
            {extraLabel && extraDisplay && (
                <p className={styles.analyticsExtra}>
                    <span className={styles.analyticsExtraLabel}>{extraLabel}:</span>{" "}
                    <span className={styles.analyticsExtraValue}>{extraDisplay}</span>
                </p>
            )}
        </div>
    );
}

function formatValue(value: number | null | undefined, decimals: number) {
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return "--";
    }
    return value.toFixed(decimals);
}

function formatInteger(value: number | null | undefined) {
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return "--";
    }
    return Math.round(value).toString();
}

function formatTimestamp(timestamp: string) {
    return new Date(timestamp).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function formatIntervalHint(intervalMs: number) {
    if (intervalMs <= 0) {
        return "Manual refresh only.";
    }
    const seconds = Math.round(intervalMs / 1000);
    if (seconds < 60) {
        return `Updates every ${seconds} seconds.`;
    }
    const minutes = (seconds / 60).toFixed(1).replace(/\.0$/, "");
    return `Updates every ${minutes} minutes.`;
}

function formatDuration(minutes: number | null) {
    if (minutes === null || !Number.isFinite(minutes)) {
        return "--";
    }
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = minutes / 60;
    if (hours < 24) {
        return `${hours.toFixed(1).replace(/\.0$/, "")} hr`;
    }
    const days = minutes / 1440;
    return `${days.toFixed(1).replace(/\.0$/, "")} days`;
}

function formatTimestampRange(start: string | null, end: string | null) {
    if (start && end) {
        return `From ${formatTimestamp(start)} to ${formatTimestamp(end)}`;
    }
    if (start) {
        return `From ${formatTimestamp(start)} onwards`;
    }
    if (end) {
        return `Until ${formatTimestamp(end)}`;
    }
    return "Timeline unavailable";
}

function formatMetricWithUnit(value: number | null, decimals: number, unit: string) {
    if (value === null || Number.isNaN(value)) {
        return "--";
    }
    const numeric =
        decimals <= 0 ? Math.round(value).toString() : value.toFixed(decimals);

    const resolvedUnit =
        unit === "count" ? formatCountUnit(value) : unit;

    if (!resolvedUnit) {
        return numeric;
    }
    const separator = resolvedUnit === "%" ? "" : " ";
    return `${numeric}${separator}${resolvedUnit}`;
}

function formatCountUnit(value: number | null | undefined) {
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return "counts";
    }
    return Math.abs(Math.round(value)) === 1 ? "count" : "counts";
}
