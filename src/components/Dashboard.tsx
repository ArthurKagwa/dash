"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import styles from "./Dashboard.module.css";
import { MetricCard } from "./MetricCard";
import { TrendChart } from "./TrendChart";
import { ThingSpeakFeed } from "@/types/thingspeak";
import { buildSnapshot, mapSeries, DEFAULT_RANGE_MINUTES } from "@/lib/thingspeak";

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
const TIME_RANGE_OPTIONS = [
    { label: "Last 30 minutes", minutes: 30 },
    { label: "Last 1 hour", minutes: 60 },
    { label: "Last 6 hours", minutes: 360 },
    { label: "Last 12 hours", minutes: 720 },
    { label: "Last 24 hours", minutes: 1440 },
    { label: "Last 7 days", minutes: 10080 }
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
    const [timeRangeMinutes, setTimeRangeMinutes] = useState(
        initialRangeMinutes > 0 ? initialRangeMinutes : DEFAULT_RANGE_MINUTES
    );

    useEffect(() => {
        setFeeds(initialFeeds);
    }, [initialFeeds]);

    useEffect(() => {
        setRefreshMs(refreshInterval >= 0 ? refreshInterval : DEFAULT_INTERVAL);
    }, [refreshInterval]);

    useEffect(() => {
        setTimeRangeMinutes(initialRangeMinutes > 0 ? initialRangeMinutes : DEFAULT_RANGE_MINUTES);
    }, [initialRangeMinutes]);

    useEffect(() => {
        let cancelled = false;

        async function refreshFeeds() {
            setIsRefreshing(true);
            try {
                const query =
                    timeRangeMinutes > 0
                        ? `minutes=${timeRangeMinutes}`
                        : `results=${RESULTS}`;
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
    }, [refreshMs, timeRangeMinutes]);

    const handleIntervalChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const nextValue = Number.parseInt(event.target.value, 10);
        if (Number.isFinite(nextValue)) {
            setRefreshMs(nextValue);
        }
    };

    const handleRangeChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const nextValue = Number.parseInt(event.target.value, 10);
        if (Number.isFinite(nextValue) && nextValue > 0) {
            setTimeRangeMinutes(nextValue);
        }
    };

    const snapshot = useMemo(() => buildSnapshot(feeds), [feeds]);
    const series = useMemo(() => mapSeries(feeds), [feeds]);

    const labels = series.map((item) => formatLabel(item.timestamp));
    const temperatureValues = series.map((item) => item.temperature);
    const humidityValues = series.map((item) => item.humidity);

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
                    <div className={styles.controlGroup}>
                        <label htmlFor="time-range" className={styles.controlLabel}>
                            Graph time range:
                        </label>
                        <select
                            id="time-range"
                            className={styles.select}
                            value={timeRangeMinutes.toString()}
                            onChange={handleRangeChange}
                        >
                            {TIME_RANGE_OPTIONS.map((option) => (
                                <option key={option.minutes} value={option.minutes.toString()}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <span className={styles.controlHint}>
                            {formatRangeHint(timeRangeMinutes)}
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
                    unit="Â°C"
                />
                <MetricCard
                    title="Humidity"
                    value={formatValue(snapshot.humidity, 1)}
                    unit="%"
                />
                <MetricCard
                    title="Motion Events"
                    value={formatInteger(snapshot.motionCount)}
                    unit="count"
                />
                <MetricCard
                    title="Battery Voltage"
                    value={formatValue(snapshot.batteryVoltage, 3)}
                    unit="V"
                />
            </section>

            <section className={styles.chartSection}>
                <h2 className={styles.chartTitle}>Temperature Trend</h2>
                <div className={styles.chartWrapper}>
                    <TrendChart
                        labels={labels}
                        data={temperatureValues}
                        label="Temperature (°C)"
                        borderColor="#333333"
                        backgroundColor="rgba(51, 51, 51, 0.08)"
                        suggestedMin={0}
                    />
                </div>
            </section>

            <section className={styles.chartSection}>
                <h2 className={styles.chartTitle}>Humidity Trend</h2>
                <div className={styles.chartWrapper}>
                    <TrendChart
                        labels={labels}
                        data={humidityValues}
                        label="Humidity (%)"
                        borderColor="#666666"
                        backgroundColor="rgba(102, 102, 102, 0.08)"
                        suggestedMax={100}
                        suggestedMin={0}

                    />
                </div>
            </section>
        </main>
    );
}

function formatValue(value: number | null, decimals: number) {
    if (value === null) {
        return "--";
    }
    return value.toFixed(decimals);
}

function formatInteger(value: number | null) {
    if (value === null) {
        return "--";
    }
    return Math.round(value).toString();
}

function formatLabel(timestamp?: string | null) {
    if (!timestamp) {
        return "";
    }
    return new Date(timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit"
    });
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

function formatRangeHint(minutes: number) {
    if (minutes < 60) {
        return `Showing roughly the last ${minutes} minutes of data.`;
    }
    const hours = minutes / 60;
    if (hours < 24) {
        return `Showing roughly the last ${trimTrailingZero(hours)} hours of data.`;
    }
    const days = hours / 24;
    return `Showing roughly the last ${trimTrailingZero(days)} days of data.`;
}

function trimTrailingZero(value: number) {
    return value % 1 === 0 ? value.toString() : value.toFixed(1);
}



