export type MetricPoint = {
    timestamp: string;
    epochMs: number;
    value: number;
};

export type ChartValuePoint = {
    timestamp: string | null;
    value: number | null;
};

export type AggregateBucket = {
    label: string;
    startIso: string;
    average: number | null;
    total: number | null;
    count: number;
};

export type MetricAggregates = {
    latestValue: number | null;
    latestTimestamp: string | null;
    min: number | null;
    max: number | null;
    average: number | null;
    sum: number | null;
    sampleCount: number;
    lastHourAverage: number | null;
    lastDayAverage: number | null;
    lastMonthAverage: number | null;
    lastHourTotal: number | null;
    lastDayTotal: number | null;
    lastMonthTotal: number | null;
    hourlyBuckets: AggregateBucket[];
    dailyBuckets: AggregateBucket[];
    monthlyBuckets: AggregateBucket[];
};

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const ONE_MONTH_MS = 30 * ONE_DAY_MS;

export function buildMetricPoints(chartPoints: ChartValuePoint[]): MetricPoint[] {
    return chartPoints
        .map((point) => {
            if (!point.timestamp || point.value === null) {
                return null;
            }
            const epochMs = Date.parse(point.timestamp);
            if (!Number.isFinite(epochMs)) {
                return null;
            }
            return {
                timestamp: point.timestamp,
                epochMs,
                value: point.value
            };
        })
        .filter((point): point is MetricPoint => point !== null)
        .sort((a, b) => a.epochMs - b.epochMs);
}

export function computeMetricAggregates(points: MetricPoint[]): MetricAggregates {
    if (!points.length) {
        return {
            latestValue: null,
            latestTimestamp: null,
        min: null,
        max: null,
        average: null,
        sum: null,
        sampleCount: 0,
        lastHourAverage: null,
        lastDayAverage: null,
        lastMonthAverage: null,
        lastHourTotal: null,
        lastDayTotal: null,
        lastMonthTotal: null,
        hourlyBuckets: [],
        dailyBuckets: [],
        monthlyBuckets: []
    };
    }

    const values = points.map((point) => point.value);
    const sum = values.reduce((acc, value) => acc + value, 0);
    const referenceMs = points[points.length - 1]?.epochMs ?? Date.now();

    return {
        latestValue: points[points.length - 1]?.value ?? null,
        latestTimestamp: points[points.length - 1]?.timestamp ?? null,
        min: Math.min(...values),
        max: Math.max(...values),
        average: sum / points.length,
        sum,
        sampleCount: points.length,
        lastHourAverage: computeWindowAverage(points, referenceMs - ONE_HOUR_MS),
        lastDayAverage: computeWindowAverage(points, referenceMs - ONE_DAY_MS),
        lastMonthAverage: computeWindowAverage(points, referenceMs - ONE_MONTH_MS),
        lastHourTotal: computeWindowTotal(points, referenceMs - ONE_HOUR_MS),
        lastDayTotal: computeWindowTotal(points, referenceMs - ONE_DAY_MS),
        lastMonthTotal: computeWindowTotal(points, referenceMs - ONE_MONTH_MS),
        hourlyBuckets: buildBuckets(points, "hour", 12),
        dailyBuckets: buildBuckets(points, "day", 10),
        monthlyBuckets: buildBuckets(points, "month", 6)
    };
}

function computeWindowAverage(points: MetricPoint[], cutoffMs: number): number | null {
    const windowValues = points.filter((point) => point.epochMs >= cutoffMs);
    if (!windowValues.length) {
        return null;
    }
    const sum = windowValues.reduce((acc, point) => acc + point.value, 0);
    return sum / windowValues.length;
}

function computeWindowTotal(points: MetricPoint[], cutoffMs: number): number | null {
    const windowValues = points.filter((point) => point.epochMs >= cutoffMs);
    if (!windowValues.length) {
        return null;
    }
    return windowValues.reduce((acc, point) => acc + point.value, 0);
}

type BucketMode = "hour" | "day" | "month";

function buildBuckets(points: MetricPoint[], mode: BucketMode, limit: number): AggregateBucket[] {
    if (!points.length) {
        return [];
    }

    const buckets = new Map<
        string,
        { sum: number; count: number; startIso: string; startEpoch: number }
    >();

    for (const point of points) {
        const bucketStart = startOf(mode, point.epochMs);
        const key = bucketKey(bucketStart, mode);
        const existing = buckets.get(key);
        if (existing) {
            existing.sum += point.value;
            existing.count += 1;
        } else {
            buckets.set(key, {
                sum: point.value,
                count: 1,
                startIso: bucketStart.toISOString(),
                startEpoch: bucketStart.getTime()
            });
        }
    }

    return Array.from(buckets.entries())
        .map(([key, stats]) => ({
            label: formatBucketLabel(stats.startIso, mode),
            startIso: stats.startIso,
            average: stats.count > 0 ? stats.sum / stats.count : null,
            total: stats.sum,
            count: stats.count
        }))
        .sort((a, b) => Date.parse(b.startIso) - Date.parse(a.startIso))
        .slice(0, limit);
}

function startOf(mode: BucketMode, epochMs: number): Date {
    const date = new Date(epochMs);
    if (mode === "month") {
        date.setUTCDate(1);
        date.setUTCHours(0, 0, 0, 0);
        return date;
    }
    if (mode === "day") {
        date.setUTCHours(0, 0, 0, 0);
        return date;
    }
    date.setUTCMinutes(0, 0, 0);
    return date;
}

function bucketKey(date: Date, mode: BucketMode): string {
    if (mode === "month") {
        return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
    }
    if (mode === "day") {
        return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
    }
    return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}-${date.getUTCHours()}`;
}

function formatBucketLabel(iso: string, mode: BucketMode): string {
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime())) {
        return iso;
    }

    if (mode === "month") {
        return date.toLocaleString("en-US", {
            month: "short",
            year: "numeric",
            timeZone: "UTC"
        });
    }

    if (mode === "day") {
        return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC"
        });
    }

    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        timeZone: "UTC",
        hour12: false
    });
}
export function deriveDifferentialSeries(
    chartPoints: ChartValuePoint[],
    options: { clampNegative?: boolean } = {}
): ChartValuePoint[] {
    const { clampNegative = true } = options;
    let previous: number | null = null;

    return chartPoints.map((point) => {
        const current = point.value;
        if (current === null || !Number.isFinite(current)) {
            previous = current;
            return { ...point, value: null };
        }

        if (previous === null || !Number.isFinite(previous)) {
            previous = current;
            return { ...point, value: null };
        }

        let diff = current - previous;
        if (diff < 0) {
            diff = clampNegative ? Math.max(0, current) : diff;
        }

        previous = current;
        return { ...point, value: diff };
    });
}

/**
 * Detects outliers in a dataset using the Interquartile Range (IQR) method.
 * Returns the indices of points that are considered outliers.
 * 
 * A point is considered an outlier if:
 * value < Q1 - 1.5 * IQR  OR  value > Q3 + 1.5 * IQR
 */
export function detectOutliers(points: MetricPoint[]): Set<number> {
    if (points.length < 4) {
        // Not enough data points to reliably detect outliers
        return new Set();
    }

    const values = points.map((point) => point.value);
    const sortedValues = [...values].sort((a, b) => a - b);
    
    const q1Index = Math.floor(sortedValues.length * 0.25);
    const q3Index = Math.floor(sortedValues.length * 0.75);
    
    const q1 = sortedValues[q1Index];
    const q3 = sortedValues[q3Index];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    const outlierIndices = new Set<number>();
    values.forEach((value, index) => {
        if (value < lowerBound || value > upperBound) {
            outlierIndices.add(index);
        }
    });
    
    return outlierIndices;
}

/**
 * Filters out outliers from a metric points array using the IQR method.
 * Returns a new array with outliers removed.
 */
export function filterOutliers(points: MetricPoint[]): MetricPoint[] {
    if (points.length < 4) {
        // Not enough data points to reliably detect outliers
        return points;
    }

    const outlierIndices = detectOutliers(points);
    
    if (outlierIndices.size === 0) {
        return points;
    }
    
    return points.filter((_, index) => !outlierIndices.has(index));
}

/**
 * Filters out outliers from chart value points for display purposes.
 * Replaces outlier values with null so they don't appear on the chart.
 */
export function filterChartOutliers(chartPoints: ChartValuePoint[]): ChartValuePoint[] {
    if (chartPoints.length < 4) {
        return chartPoints;
    }

    // Build metric points for outlier detection
    const metricPoints = buildMetricPoints(chartPoints);
    if (metricPoints.length < 4) {
        return chartPoints;
    }

    const outlierIndices = detectOutliers(metricPoints);
    
    if (outlierIndices.size === 0) {
        return chartPoints;
    }

    // Create a map of timestamps to outlier status
    const outlierTimestamps = new Set<string>();
    metricPoints.forEach((point, index) => {
        if (outlierIndices.has(index)) {
            outlierTimestamps.add(point.timestamp);
        }
    });

    // Replace outlier values with null
    return chartPoints.map((point) => {
        if (point.timestamp && outlierTimestamps.has(point.timestamp)) {
            return { ...point, value: null };
        }
        return point;
    });
}
